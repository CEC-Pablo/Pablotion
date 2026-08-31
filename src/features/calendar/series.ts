/**
 * Series: repetir lo mismo en varios días del calendario.
 *
 * «Pastilla todos los lunes durante tres meses» son trece lunes. La app crea
 * **trece entradas de verdad**, no una entrada con una regla que la pantalla
 * finge trece veces.
 *
 * Es la decisión de fondo y merece la pena explicarla, porque la alternativa
 * parece más elegante y no lo es. Con una entrada virtual habría que enseñarla
 * en trece sitios (rejilla, lista del día, Tareas, Inicio, búsqueda) y, sobre
 * todo, no habría dónde anotar que el lunes 8 sí te la tomaste y el 15 no:
 * haría falta una tabla de excepciones para una funcionalidad cuyo sentido es
 * justamente ir tachando de una en una. Copias reales lo dan gratis: cada una
 * se completa, se edita y se borra por su cuenta, y todas las pantallas que ya
 * existen funcionan sin tocar una línea.
 *
 * Lo que sí comparten es un `series_id`, para poder borrar el grupo entero sin
 * ir una por una — que sería peor que haberlas creado a mano.
 *
 * Todo aquí es puro: no toca la base ni las notificaciones.
 */

import { addDays, addMonths, addWeeks, isAfter } from 'date-fns';

import { WEEKDAY_NAMES } from '../../i18n';
import { formatDayMonth, toAppWeekday } from '../../lib/dates';
import type { SeriesFrequency, SeriesMonths } from '../../types';

/**
 * Tope de copias por serie.
 *
 * No es una cifra caprichosa: «cada día durante seis meses» son 183 entradas,
 * y a partir de cierto punto lo que se crea no es una rutina sino un montón de
 * basura que habrá que borrar. 120 cubre de sobra los casos con sentido —un
 * año de lunes son 53, tres meses de días seguidos son 92— y deja el resto
 * fuera de forma visible: la vista previa dice cuándo se corta y por qué, en
 * vez de crear 183 en silencio.
 */
export const MAX_SERIES_COPIES = 120;

/**
 * Las fechas de la serie, empezando por la propia fecha elegida.
 *
 * Cada fecha se calcula **desde el origen**, nunca desde la anterior. Suena a
 * detalle y no lo es: encadenando `addMonths` desde el 31 de enero saldría 28
 * de febrero y de ahí 28 de marzo, y la serie se iría desplazando sola. Desde
 * el origen, febrero se ajusta al 28 y marzo vuelve al 31, que es lo que
 * cualquiera espera de «el mismo día de cada mes».
 *
 * Por la misma razón se usa la aritmética de calendario de date-fns y no sumas
 * de milisegundos: `addWeeks` conserva la hora del reloj, así que «los lunes a
 * las 9:00» sigue siendo a las 9:00 después de un cambio de horario de verano.
 * Sumando 7 × 24 horas se convertiría en las 8:00 o las 10:00.
 */
export function seriesDates(
  start: Date,
  frequency: SeriesFrequency,
  months: SeriesMonths
): Date[] {
  const end = addMonths(start, months);
  const dates: Date[] = [];

  for (let i = 0; dates.length < MAX_SERIES_COPIES; i++) {
    const next = stepFrom(start, frequency, i);
    if (isAfter(next, end)) break;
    dates.push(next);
  }

  return dates;
}

function stepFrom(start: Date, frequency: SeriesFrequency, i: number): Date {
  switch (frequency) {
    case 'daily':
      return addDays(start, i);
    case 'weekly':
      return addWeeks(start, i);
    case 'biweekly':
      return addWeeks(start, i * 2);
    case 'monthly':
      return addMonths(start, i);
  }
}

/** ¿La serie se quedó a medias por el tope? */
export function isCapped(dates: Date[]): boolean {
  return dates.length >= MAX_SERIES_COPIES;
}

/**
 * En español solo pluralizan sábado y domingo; el resto de los días son
 * invariables. «Todos los lunes», pero «todos los sábados».
 */
function weekdayPlural(date: Date): string {
  const name = WEEKDAY_NAMES[toAppWeekday(date)] ?? '';
  return name.endsWith('s') ? name : `${name}s`;
}

/**
 * La línea que se lee antes de confirmar: cuántas, de qué y hasta cuándo.
 *
 * La app no crea nada que no se pueda ver antes — es la misma regla que la
 * vista previa del creador de recordatorios. Aquí importa el doble, porque
 * confirmar sin mirar puede sembrar el calendario de cien filas.
 */
export function describeSeries(dates: Date[], frequency: SeriesFrequency): string {
  if (dates.length <= 1) return 'Solo ese día.';

  const last = dates[dates.length - 1];
  const count = dates.length;

  let what: string;
  switch (frequency) {
    case 'daily':
      what = `${count} días seguidos`;
      break;
    case 'weekly':
      what = `${count} ${weekdayPlural(dates[0])}`;
      break;
    case 'biweekly':
      what = `${count} ${weekdayPlural(dates[0])}, una semana sí y otra no`;
      break;
    case 'monthly':
      what = `${count} meses, siempre el día ${dates[0].getDate()}`;
      break;
  }

  const tail = isCapped(dates)
    ? ` (el máximo son ${MAX_SERIES_COPIES})`
    : '';

  return `${what}, hasta el ${formatDayMonth(last)}${tail}.`;
}
