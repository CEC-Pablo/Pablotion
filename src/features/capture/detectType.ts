/**
 * Detección automática de tipo (§6.1).
 *
 * Las cuatro reglas del paquete de diseño, evaluadas **en orden** y en cada
 * pulsación. Gana la primera que coincida.
 *
 * Las listas de palabras se comparan sobre el texto normalizado (sin acentos,
 * en minúsculas). El diseño ya enumeraba pares como «avísame / avisame», así
 * que normalizar extiende esa misma cortesía al resto de la lista en vez de
 * dejarla a medias — y es el mismo criterio que ya usa la búsqueda.
 *
 * Una detección equivocada nunca bloquea el guardado.
 */

import { normalize } from '../../lib/normalize';
import type { EntryType } from '../../types';

/** Regla 1 — intención explícita de que la app avise. */
const REMINDER_PHRASES = [
  'recuérdame',
  'recordar',
  'recordá',
  'avísame',
  'avisame',
  'no olvidar',
  'no se me olvide',
  'alarma',
].map(normalize);

/** Regla 2 — palabras de tiempo. */
const TIME_PHRASES = [
  'pasado mañana',
  'hoy',
  'mañana',
  'la próxima semana',
  'el lunes',
  'el martes',
  'el miércoles',
  'el jueves',
  'el viernes',
  'el sábado',
  'el domingo',
].map(normalize);

/** Regla 2 — «a las 9», «a las 21:30». */
const AT_HOUR = /\ba las \d/;

/** Regla 3 — verbo de acción, solo si abre la frase. */
const ACTION_VERBS = [
  'comprar',
  'llamar',
  'enviar',
  'terminar',
  'hacer',
  'escribir',
  'revisar',
  'estudiar',
  'entregar',
  'pagar',
  'leer',
  'imprimir',
  'reservar',
  'mandar',
].map(normalize);

/** Coincidencia de palabra completa, para que «hoyo» no dispare «hoy». */
function containsPhrase(haystack: string, phrase: string): boolean {
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(phrase, from);
    if (at === -1) return false;

    const before = at === 0 ? '' : haystack[at - 1];
    const after = haystack[at + phrase.length] ?? '';
    const isBoundary = (c: string) => c === '' || !/[a-z0-9]/.test(c);

    if (isBoundary(before) && isBoundary(after)) return true;
    from = at + 1;
  }
}

export function detectType(text: string): EntryType {
  const haystack = normalize(text).trim();
  if (!haystack) return 'note';

  // 1. Intención explícita de recordatorio.
  if (REMINDER_PHRASES.some((p) => containsPhrase(haystack, p))) return 'reminder';

  // 2. Palabras de tiempo.
  if (TIME_PHRASES.some((p) => containsPhrase(haystack, p))) return 'reminder';
  if (AT_HOUR.test(haystack)) return 'reminder';

  // 3. Verbo de acción al inicio.
  const firstWord = haystack.split(/\s+/)[0];
  if (ACTION_VERBS.includes(firstWord)) return 'task';

  // 4. Nada coincide.
  return 'note';
}
