import assert from 'node:assert/strict';
import { test } from 'node:test';

import { differenceInCalendarDays } from 'date-fns';

import {
  WINDOW_GLOBAL,
  allocateWindow,
  primaryOccurrences,
  relativeFromDue,
  relativeOccurrences,
  type PrimarySpec,
  type RulePlan,
} from './occurrences';

const at = (iso: string) => new Date(iso);

const spec = (over: Partial<PrimarySpec> = {}): PrimarySpec => ({
  frequency: 'daily',
  weeklyDay: null,
  customInterval: null,
  customUnit: null,
  ...over,
});

/* --------------------------------------------------------------- una vez */

test('once — devuelve la única ocurrencia si está en el futuro', () => {
  const out = primaryOccurrences(
    spec({ frequency: 'once' }),
    at('2026-08-18T09:00:00'),
    at('2026-08-17T10:00:00')
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].toISOString(), at('2026-08-18T09:00:00').toISOString());
});

test('once — no programa nada si ya pasó', () => {
  const out = primaryOccurrences(
    spec({ frequency: 'once' }),
    at('2026-08-16T09:00:00'),
    at('2026-08-17T10:00:00')
  );
  assert.deepEqual(out, []);
});

/* ----------------------------------------------------------------- diaria */

test('daily — llena la ventana, un día de calendario aparte, siempre a la misma hora', () => {
  const out = primaryOccurrences(
    spec(),
    at('2026-08-17T09:00:00'),
    at('2026-08-17T08:00:00')
  );
  assert.equal(out.length, 8);
  for (let i = 1; i < out.length; i++) {
    assert.equal(differenceInCalendarDays(out[i], out[i - 1]), 1, `hueco ${i}`);
    // La invariante real: «todos los días a las 9:00» sigue siendo 9:00
    // aunque en medio haya un cambio de horario de verano. Medir el hueco en
    // milisegundos afirmaría espaciado constante en UTC, que es lo contrario.
    assert.equal(out[i].getHours(), 9, `la ocurrencia ${i} cambió de hora`);
  }
});

test('daily — con la hora de hoy ya pasada, arranca mañana', () => {
  const out = primaryOccurrences(
    spec(),
    at('2026-08-17T09:00:00'),
    at('2026-08-17T10:00:00')
  );
  assert.equal(out[0].getDate(), 18);
  assert.equal(out[0].getHours(), 9);
});

test('daily — una fecha de vencimiento vieja rueda hasta el futuro', () => {
  const out = primaryOccurrences(
    spec(),
    at('2026-01-05T09:00:00'),
    at('2026-08-17T10:00:00')
  );
  assert.ok(out[0] > at('2026-08-17T10:00:00'));
  assert.equal(out[0].getHours(), 9);
  assert.equal(out[0].getDate(), 18);
});

test('daily — la serie cubre el cuarto día sin abrir la app (§8)', () => {
  // El criterio de terminado más duro: una regla diaria creada hoy debe tener
  // ya programado el disparo del cuarto día, porque con la app terminada no
  // hay código que recalcule nada.
  const now = at('2026-08-17T08:00:00');
  const out = primaryOccurrences(spec(), at('2026-08-17T09:00:00'), now);
  const fourthDay = out.find((d) => d.getDate() === 20);
  assert.ok(fourthDay, 'no hay ocurrencia para el 20 de agosto');
  assert.equal(fourthDay!.getHours(), 9);
});

/* ---------------------------------------------------------------- semanal */

test('weekly — alinea al día pedido (0 = lunes) y avanza de 7 en 7', () => {
  // 17 de agosto de 2026 es lunes. weeklyDay 2 = miércoles.
  const out = primaryOccurrences(
    spec({ frequency: 'weekly', weeklyDay: 2 }),
    at('2026-08-17T09:00:00'),
    at('2026-08-17T08:00:00')
  );
  assert.equal(out[0].getDate(), 19);
  assert.equal(out[0].getDay(), 3, 'getDay() 3 = miércoles');
  for (let i = 1; i < out.length; i++) {
    assert.equal(differenceInCalendarDays(out[i], out[i - 1]), 7, `hueco ${i}`);
    assert.equal(out[i].getDay(), 3, 'sigue cayendo en miércoles');
    assert.equal(out[i].getHours(), 9, 'sigue siendo a las 9:00 tras el cambio de hora');
  }
});

test('weekly — el domingo del diseño (6) es el 0 de getDay()', () => {
  const out = primaryOccurrences(
    spec({ frequency: 'weekly', weeklyDay: 6 }),
    at('2026-08-17T09:00:00'),
    at('2026-08-17T08:00:00')
  );
  assert.equal(out[0].getDay(), 0);
  assert.equal(out[0].getDate(), 23);
});

/* ----------------------------------------------------------- personalizada */

test('custom — cada 3 días', () => {
  const out = primaryOccurrences(
    spec({ frequency: 'custom', customInterval: 3, customUnit: 'days' }),
    at('2026-08-17T09:00:00'),
    at('2026-08-17T08:00:00')
  );
  assert.equal(out[0].getDate(), 17);
  assert.equal(out[1].getDate(), 20);
  assert.equal(out[2].getDate(), 23);
});

test('custom — cada 6 horas', () => {
  const out = primaryOccurrences(
    spec({ frequency: 'custom', customInterval: 6, customUnit: 'hours' }),
    at('2026-08-17T09:00:00'),
    at('2026-08-17T08:00:00')
  );
  assert.equal(out[1].getTime() - out[0].getTime(), 6 * 3_600_000);
});

test('custom — horas con vencimiento viejo no itera de más', () => {
  const now = at('2026-08-17T10:00:00');
  const out = primaryOccurrences(
    spec({ frequency: 'custom', customInterval: 1, customUnit: 'hours' }),
    at('2026-01-01T00:00:00'),
    now
  );
  assert.ok(out[0] > now);
  assert.ok(out[0].getTime() - now.getTime() <= 3_600_000);
});

/* ------------------------------------------------------------ aviso previo */

test('relativo — se desplaza desde cada ocurrencia de la principal', () => {
  const now = at('2026-08-17T07:00:00');
  const primaries = primaryOccurrences(spec(), at('2026-08-17T09:00:00'), now, 3);
  const rel = relativeOccurrences(primaries, 60, now);

  assert.equal(rel.length, 3, 'un aviso por cada disparo, no solo el primero');
  for (let i = 0; i < rel.length; i++) {
    assert.equal(primaries[i].getTime() - rel[i].getTime(), 3_600_000);
  }
});

test('relativo — un aviso que cae justo en «ahora» no se programa', () => {
  const now = at('2026-08-17T08:00:00');
  const rel = relativeOccurrences([at('2026-08-17T09:00:00')], 60, now);
  assert.deepEqual(rel, [], 'programar para el instante actual no sirve de nada');
});

test('relativo — «el día anterior» cruza a la fecha previa', () => {
  const now = at('2026-08-17T08:00:00');
  const rel = relativeOccurrences([at('2026-08-19T09:00:00')], 1440, now);
  assert.equal(rel[0].getDate(), 18);
  assert.equal(rel[0].getHours(), 9);
});

test('relativo — descarta el aviso cuya hora ya pasó, sin tocar el principal', () => {
  // Son las 8:30; el aviso de las 8:00 ya pasó, pero el disparo de las 9:00 no.
  const now = at('2026-08-17T08:30:00');
  const primaries = primaryOccurrences(spec(), at('2026-08-17T09:00:00'), now, 2);
  const rel = relativeOccurrences(primaries, 60, now);

  assert.equal(primaries[0].getDate(), 17, 'el principal de hoy sigue en pie');
  assert.equal(rel.length, 1);
  assert.equal(rel[0].getDate(), 18, 'el primer aviso vivo es el de mañana');
});

test('relativo sin principal — se desplaza desde due_at', () => {
  const now = at('2026-08-17T08:00:00');
  assert.equal(relativeFromDue(at('2026-08-18T09:00:00'), 180, now)[0].getHours(), 6);
  assert.deepEqual(relativeFromDue(at('2026-08-17T08:30:00'), 180, now), []);
});

/* -------------------------------------------------------- ventana global */

test('allocateWindow — 10 recordatorios diarios no superan el tope de iOS (§8)', () => {
  // 10 recordatorios × 2 reglas (principal + aviso previo) = 20 reglas.
  const now = at('2026-08-17T08:00:00');
  const plans: RulePlan[] = [];
  for (let i = 0; i < 10; i++) {
    const primaries = primaryOccurrences(spec(), at('2026-08-17T09:00:00'), now);
    plans.push({ ruleId: `p${i}`, occurrences: primaries });
    plans.push({ ruleId: `r${i}`, occurrences: relativeOccurrences(primaries, 60, now) });
  }

  const total = allocateWindow(plans).reduce((n, p) => n + p.occurrences.length, 0);
  assert.ok(total <= WINDOW_GLOBAL, `${total} solicitudes supera el tope de ${WINDOW_GLOBAL}`);
  assert.ok(total <= 64, 'supera el límite duro de iOS');
});

test('allocateWindow — con presupuesto justo, toda regla conserva su próximo disparo', () => {
  const now = at('2026-08-17T08:00:00');
  const plans: RulePlan[] = [];
  for (let i = 0; i < 20; i++) {
    plans.push({
      ruleId: `r${i}`,
      occurrences: primaryOccurrences(spec(), at('2026-08-17T09:00:00'), now),
    });
  }

  const allocated = allocateWindow(plans);
  assert.equal(allocated.length, 20, 'ninguna regla se queda sin programar');
  for (const plan of allocated) {
    assert.ok(plan.occurrences.length >= 1);
  }
});

test('allocateWindow — descarta las reglas sin ocurrencias', () => {
  const out = allocateWindow([
    { ruleId: 'vacía', occurrences: [] },
    { ruleId: 'viva', occurrences: [at('2026-08-18T09:00:00')] },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].ruleId, 'viva');
});
