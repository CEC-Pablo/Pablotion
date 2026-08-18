/**
 * Cálculo de la serie de ocurrencias (§6.3).
 *
 * Funciones puras: no tocan la base ni expo-notifications. Todo el cálculo va
 * en hora local del dispositivo — `addDays` de date-fns suma días de
 * calendario preservando la hora del reloj, que es justo lo que hace falta
 * para que «todos los días a las 9:00» siga siendo a las 9:00 al cruzar un
 * cambio de horario de verano.
 */

import { addDays, addHours, addMinutes, differenceInCalendarDays } from 'date-fns';

import { fromAppWeekday } from '../../lib/dates';
import type { CustomUnit, Frequency } from '../../types';

/** Suelo de ocurrencias por regla dentro de la ventana. */
export const WINDOW_PER_RULE = 8;

/** Techo por regla, para que una regla insistente no acapare el presupuesto. */
export const WINDOW_MAX_PER_RULE = 24;

/**
 * Horizonte que se intenta cubrir por delante, en horas.
 *
 * Ocho ocurrencias son ocho días para una regla diaria, pero solo 24 horas
 * para una cada 3 horas: si no abres la app en un día, la serie se agota y
 * dejas de recibir avisos justo en el caso en que más los querías. Por eso el
 * número de huecos se calcula desde el intervalo, no es fijo.
 */
const TARGET_HORIZON_HOURS = 72;

/**
 * Tope global de solicitudes pendientes. iOS solo admite 64 por app; 56 deja
 * margen para que una programación nueva no expulse a las ya puestas.
 */
export const WINDOW_GLOBAL = 56;

/** Cada cuántas horas dispara la regla. `null` si no se repite. */
function stepHours(spec: PrimarySpec): number | null {
  switch (spec.frequency) {
    case 'once':
      return null;
    case 'daily':
      return 24;
    case 'weekly':
      return 24 * 7;
    case 'custom': {
      const interval = spec.customInterval ?? 1;
      if (interval <= 0) return null;
      return spec.customUnit === 'hours' ? interval : interval * 24;
    }
  }
}

/**
 * Cuántas ocurrencias programar por delante para esta regla.
 *
 * Se busca cubrir `TARGET_HORIZON_HOURS`, con un suelo de `WINDOW_PER_RULE`
 * (para que las reglas espaciadas conserven su margen largo) y un techo de
 * `WINDOW_MAX_PER_RULE` (para que una regla cada hora no se coma el
 * presupuesto global).
 */
export function slotsForRule(spec: PrimarySpec): number {
  const step = stepHours(spec);
  if (step === null) return 1;

  const needed = Math.ceil(TARGET_HORIZON_HOURS / step);
  return Math.min(WINDOW_MAX_PER_RULE, Math.max(WINDOW_PER_RULE, needed));
}

export interface PrimarySpec {
  frequency: Frequency;
  /** 0 = lunes … 6 = domingo. Solo para `weekly`. */
  weeklyDay: number | null;
  /** 1–30. Solo para `custom`. */
  customInterval: number | null;
  customUnit: CustomUnit | null;
}

/**
 * Primera ocurrencia estrictamente posterior a `now`, partiendo de `dueAt`.
 * Se calcula por aritmética directa en vez de avanzando en bucle, para que
 * una fecha de vencimiento vieja no cueste miles de iteraciones.
 */
function firstAfter(spec: PrimarySpec, dueAt: Date, now: Date): Date | null {
  switch (spec.frequency) {
    case 'once':
      return dueAt > now ? dueAt : null;

    case 'daily': {
      if (dueAt > now) return dueAt;
      let next = addDays(dueAt, Math.max(0, differenceInCalendarDays(now, dueAt)));
      while (next <= now) next = addDays(next, 1);
      return next;
    }

    case 'weekly': {
      const target = fromAppWeekday(spec.weeklyDay ?? 0);
      // Alinear al día de la semana pedido, conservando la hora de `dueAt`.
      let next = addDays(dueAt, (target - dueAt.getDay() + 7) % 7);
      if (next <= now) {
        const weeksBehind = Math.floor(differenceInCalendarDays(now, next) / 7);
        next = addDays(next, Math.max(0, weeksBehind) * 7);
        while (next <= now) next = addDays(next, 7);
      }
      return next;
    }

    case 'custom': {
      const interval = spec.customInterval ?? 1;
      if (interval <= 0) return null;
      if (dueAt > now) return dueAt;

      if (spec.customUnit === 'hours') {
        const stepMs = interval * 3_600_000;
        const steps = Math.ceil((now.getTime() - dueAt.getTime()) / stepMs);
        let next = addHours(dueAt, steps * interval);
        while (next <= now) next = addHours(next, interval);
        return next;
      }

      const steps = Math.ceil(differenceInCalendarDays(now, dueAt) / interval);
      let next = addDays(dueAt, Math.max(0, steps) * interval);
      while (next <= now) next = addDays(next, interval);
      return next;
    }
  }
}

function advance(spec: PrimarySpec, from: Date): Date {
  switch (spec.frequency) {
    case 'daily':
      return addDays(from, 1);
    case 'weekly':
      return addDays(from, 7);
    case 'custom':
      return spec.customUnit === 'hours'
        ? addHours(from, spec.customInterval ?? 1)
        : addDays(from, spec.customInterval ?? 1);
    case 'once':
      return from;
  }
}

/**
 * La serie de la regla principal: hasta `count` ocurrencias futuras.
 * `once` devuelve como mucho una.
 */
export function primaryOccurrences(
  spec: PrimarySpec,
  dueAt: Date,
  now: Date = new Date(),
  count: number = -1
): Date[] {
  const slots = count > 0 ? count : slotsForRule(spec);
  const first = firstAfter(spec, dueAt, now);
  if (!first) return [];
  if (spec.frequency === 'once') return [first];

  const out: Date[] = [first];
  while (out.length < slots) {
    out.push(advance(spec, out[out.length - 1]));
  }
  return out;
}

/**
 * El aviso previo se calcula **desde cada ocurrencia de la principal**, no
 * desde `due_at`: así «diaria + 1 hora antes» avisa antes de *cada* disparo.
 *
 * Al retroceder, la fecha puede caer al día anterior — es el caso que el
 * prototipo ya contemplaba. Las que quedan en el pasado se descartan: si el
 * aviso de hoy ya pasó, el disparo principal de hoy sigue en pie.
 */
export function relativeOccurrences(
  primaries: Date[],
  offsetMinutes: number,
  now: Date = new Date()
): Date[] {
  return primaries.map((d) => addMinutes(d, -offsetMinutes)).filter((d) => d > now);
}

/** Sin regla principal (`once`), el aviso previo se desplaza desde `due_at`. */
export function relativeFromDue(
  dueAt: Date,
  offsetMinutes: number,
  now: Date = new Date()
): Date[] {
  const at = addMinutes(dueAt, -offsetMinutes);
  return at > now ? [at] : [];
}

export interface RulePlan {
  ruleId: string;
  occurrences: Date[];
}

/**
 * Reparte el presupuesto global entre las reglas.
 *
 * Se ordena por cercanía de la primera ocurrencia y se sirve por rondas, de
 * modo que con muchas reglas activas todas conserven al menos su próximo
 * disparo antes de que ninguna acapare sus ocho. Lo que no entra se repone al
 * abrir la app.
 */
export function allocateWindow(
  plans: RulePlan[],
  globalCap: number = WINDOW_GLOBAL
): RulePlan[] {
  const ordered = plans
    .filter((p) => p.occurrences.length > 0)
    .sort((a, b) => a.occurrences[0].getTime() - b.occurrences[0].getTime());

  const taken = new Map<string, Date[]>(ordered.map((p) => [p.ruleId, []]));
  let budget = globalCap;

  for (let round = 0; round < WINDOW_MAX_PER_RULE && budget > 0; round++) {
    for (const plan of ordered) {
      if (budget === 0) break;
      const next = plan.occurrences[round];
      if (!next) continue;
      taken.get(plan.ruleId)!.push(next);
      budget--;
    }
  }

  return ordered
    .map((p) => ({ ruleId: p.ruleId, occurrences: taken.get(p.ruleId)! }))
    .filter((p) => p.occurrences.length > 0);
}
