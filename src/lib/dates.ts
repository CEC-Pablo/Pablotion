/**
 * Fechas: siempre en la zona horaria local del dispositivo, nunca UTC (§6.2).
 * Los objetos `Date` de JavaScript ya operan en local, así que no hace falta
 * conversión — lo que hace falta es no introducir UTC por accidente.
 */

import { format, isSameDay, subDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

import { WEEKDAY_NAMES } from '../i18n';

/**
 * El diseño numera los días con 0 = lunes (fila L M X J V S D).
 * `Date.getDay()` usa 0 = domingo. Toda la conversión pasa por estas dos
 * funciones y por ningún otro sitio.
 */
export function toAppWeekday(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function fromAppWeekday(appWeekday: number): number {
  return (appWeekday + 1) % 7;
}

export function appWeekdayName(appWeekday: number): string {
  return WEEKDAY_NAMES[appWeekday] ?? '';
}

/** "martes 18 de agosto, 9:00" — el formato de la tarjeta de preview. */
export function formatFullDate(date: Date): string {
  return format(date, "EEEE d 'de' MMMM, H:mm", { locale: es });
}

/** "18 de agosto" — sin día de la semana ni hora. */
export function formatDayMonth(date: Date): string {
  return format(date, "d 'de' MMMM", { locale: es });
}

/** "vie 21 · 9:00" — el meta de vencimiento bajo la fila de lista. */
export function formatShortDue(date: Date): string {
  return `${format(date, 'EEE d', { locale: es })} · ${format(date, 'H:mm')}`;
}

/** "9:00" — sin cero a la izquierda, como el ciclado de horas del diseño. */
export function formatTime(date: Date): string {
  return format(date, 'H:mm');
}

/**
 * Formato con el que un día viaja en la URL de la hoja del calendario.
 *
 * Se lee de vuelta con `parse`, nunca con `new Date(cadena)`: esa forma
 * interpreta "2026-09-02" como medianoche UTC y en Chile eso cae el día
 * anterior por la tarde.
 */
export const DAY_PARAM_FORMAT = 'yyyy-MM-dd';

export function dayParam(date: Date): string {
  return format(date, DAY_PARAM_FORMAT);
}

/** "agosto 2026" — la cabecera del calendario compacto. */
export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy', { locale: es });
}

/** "hoy, 7:40" / "ayer, 19:12" / "12 de agosto, 19:12" — la fila "Creada". */
export function formatCreated(date: Date, now: Date = new Date()): string {
  const time = formatTime(date);
  if (isSameDay(date, now)) return `hoy, ${time}`;
  if (isSameDay(date, subDays(now, 1))) return `ayer, ${time}`;
  return `${formatDayMonth(date)}, ${time}`;
}

export type DayGroup = 'today' | 'yesterday' | 'older';

/** El grupo de la lista de Inicio, derivado de `created_at` (nunca una cadena fija). */
export function dayGroup(date: Date, now: Date = new Date()): DayGroup {
  if (isSameDay(date, now)) return 'today';
  if (isSameDay(date, subDays(now, 1))) return 'yesterday';
  return 'older';
}

export const DAY_GROUP_LABEL: Record<DayGroup, string> = {
  today: 'Hoy',
  yesterday: 'Ayer',
  older: 'Antes',
};

/** Kicker de la cabecera de Inicio: "LUNES 17 DE AGOSTO". */
export function headerDate(date: Date = new Date()): string {
  return format(date, "EEEE d 'de' MMMM", { locale: es });
}

/**
 * Aplica hora y minuto a una fecha. Devuelve un `Date` nuevo; no muta el
 * argumento. Los valores se acotan al rango válido para que un dato corrupto
 * no produzca un `Invalid Date` que reviente al serializar a ISO.
 */
export function withTime(date: Date, hour: number, minute: number = 0): Date {
  const next = new Date(date);
  const safeHour = Number.isFinite(hour) ? Math.min(23, Math.max(0, Math.trunc(hour))) : 0;
  const safeMinute = Number.isFinite(minute)
    ? Math.min(59, Math.max(0, Math.trunc(minute)))
    : 0;
  next.setHours(safeHour, safeMinute, 0, 0);
  return next;
}

/** Formatea «HH:MM» con cero a la izquierda, para el campo de hora manual. */
export function formatHHMM(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Interpreta lo que el usuario escribe en el campo de hora. Acepta «9», «9:5»,
 * «09:05», «21.30». Devuelve `null` si no hay una hora válida todavía, para
 * que el campo pueda estar a medio escribir sin romper nada.
 */
export function parseHHMM(text: string): { hour: number; minute: number } | null {
  const match = text.trim().match(/^(\d{1,2})\s*[:.,]?\s*(\d{1,2})?$/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = match[2] === undefined ? 0 : Number(match[2]);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;

  return { hour, minute };
}

/** ¿Es un día anterior a hoy? Las celdas pasadas van deshabilitadas (§6.2). */
export function isPastDay(date: Date, now: Date = new Date()): boolean {
  return startOfDay(date) < startOfDay(now);
}

export function toISO(date: Date): string {
  return date.toISOString();
}

export function fromISO(iso: string): Date {
  return new Date(iso);
}
