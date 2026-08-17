/**
 * Comparación insensible a acentos y mayúsculas. La usan tanto la búsqueda
 * (§8, "Datos") como la detección de tipo.
 *
 * El texto se compara normalizado pero **se pinta con sus acentos originales**:
 * el resaltado parte la cadena original según el índice hallado en la versión
 * normalizada. Cada carácter precompuesto se descompone en base + diacrítico
 * combinante, y al quitar solo el combinante queda un carácter por carácter
 * original, así que los índices de ambas cadenas siguen alineados.
 */
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');

export function normalize(text: string): string {
  return text.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase();
}

export interface HighlightSplit {
  pre: string;
  hit: string;
  post: string;
}

/**
 * Parte `text` en pre/hit/post según dónde caiga `query` en la versión
 * normalizada. Devuelve `null` si no hay coincidencia.
 */
export function splitOnMatch(text: string, query: string): HighlightSplit | null {
  const needle = normalize(query.trim());
  if (!needle) return null;

  const index = normalize(text).indexOf(needle);
  if (index === -1) return null;

  return {
    pre: text.slice(0, index),
    hit: text.slice(index, index + needle.length),
    post: text.slice(index + needle.length),
  };
}

export function matches(text: string, query: string): boolean {
  const needle = normalize(query.trim());
  return needle.length > 0 && normalize(text).includes(needle);
}
