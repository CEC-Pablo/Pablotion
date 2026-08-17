/**
 * Vista previa de próxima notificación (§6.4).
 *
 * Momento de deleite nº 5 y criterio 3 de terminado: se recalcula **en vivo**
 * con cada cambio de fecha, hora o frecuencia — sin debounce y sin botón de
 * confirmar. Por eso es una función pura y barata.
 */

import { appWeekdayName, formatFullDate, formatTime } from '../../lib/dates';
import { RELATIVE_LABEL } from '../../i18n';
import type { CustomUnit, Frequency } from '../../types';
import { primaryOccurrences, relativeFromDue, relativeOccurrences } from './occurrences';

export interface PreviewInput {
  dueAt: Date;
  frequency: Frequency;
  /** 0 = lunes … 6 = domingo. */
  weeklyDay: number | null;
  customInterval: number | null;
  customUnit: CustomUnit | null;
  /** El aviso previo es independiente y combinable — ver §3.1. */
  relativeOffsetMinutes: number | null;
  now?: Date;
}

export interface Preview {
  /** Línea grande: la próxima notificación principal. */
  headline: string;
  /** Segunda línea: cómo se repite. */
  repeat: string;
  /** Tercera línea, solo con aviso previo activo. */
  relative: string | null;
}

function repeatLine(input: PreviewInput, at: Date): string {
  const time = formatTime(at);

  switch (input.frequency) {
    case 'once':
      return 'Una sola vez. No se repite.';
    case 'daily':
      return `Después, todos los días a las ${time}.`;
    case 'weekly':
      return `Después, cada ${appWeekdayName(input.weeklyDay ?? 0)} a las ${time}.`;
    case 'custom': {
      const n = input.customInterval ?? 1;
      const unit = input.customUnit === 'hours' ? 'horas' : 'días';
      // «cada 1 días» chirría; en singular la unidad va sin número.
      const every = n === 1 ? (input.customUnit === 'hours' ? 'hora' : 'día') : `${n} ${unit}`;
      return `Después, cada ${every} a las ${time}.`;
    }
  }
}

export function buildPreview(input: PreviewInput): Preview {
  const now = input.now ?? new Date();
  const spec = {
    frequency: input.frequency,
    weeklyDay: input.weeklyDay,
    customInterval: input.customInterval,
    customUnit: input.customUnit,
  };

  const primaries = primaryOccurrences(spec, input.dueAt, now, 2);
  // Si la fecha elegida ya pasó, la tarjeta sigue mostrando algo coherente en
  // vez de quedarse en blanco: el selector es quien impide elegirla.
  const headlineAt = primaries[0] ?? input.dueAt;

  let relative: string | null = null;
  if (input.relativeOffsetMinutes != null) {
    const offset = input.relativeOffsetMinutes;
    const rel =
      input.frequency === 'once'
        ? relativeFromDue(input.dueAt, offset, now)
        : relativeOccurrences(primaries, offset, now);

    const target = input.frequency === 'once' ? input.dueAt : headlineAt;
    const label = RELATIVE_LABEL[offset] ?? `${offset} minutos antes`;
    relative =
      rel.length > 0
        ? `${label} del vencimiento (${formatFullDate(target)})`
        : `${label} del vencimiento — el próximo aviso ya pasó`;
  }

  return {
    headline: formatFullDate(headlineAt),
    repeat: repeatLine(input, headlineAt),
    relative,
  };
}
