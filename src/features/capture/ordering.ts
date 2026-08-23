/**
 * Orden y agrupación de la lista de Inicio.
 *
 * Tres ejes, en este orden de mando:
 *
 *   1. **Día** (`created_at`) — Hoy → Ayer → Antes. Es el eje principal.
 *   2. **Prioridad** — lo urgente arriba. Sin prioridad va al final.
 *   3. **Posición manual** — dentro de un mismo grupo, lo que el usuario
 *      haya arrastrado manda; empata por fecha de creación.
 *
 * Las entradas con etiqueta se apartan a una sección plegable por etiqueta,
 * para que Inicio no se vuelva una pared de texto. Es opcional: el ajuste
 * «Agrupar por etiqueta» lo desactiva.
 */

import { dayGroup, type DayGroup } from '../../lib/dates';
import type { Entry, Priority, Tag } from '../../types';

/** Menor va antes. Sin prioridad se hunde al final de su grupo. */
const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export function priorityRank(priority: Priority | null): number {
  return priority === null ? 3 : PRIORITY_RANK[priority];
}

/**
 * Ordena dentro de un grupo ya homogéneo (mismo día, misma etiqueta).
 * No muta el array de entrada.
 */
export function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    const byPriority = priorityRank(a.priority) - priorityRank(b.priority);
    if (byPriority !== 0) return byPriority;

    // A igual prioridad manda el arrastre del usuario.
    if (a.position !== b.position) return a.position - b.position;

    // Y si nadie ha arrastrado nada, lo más reciente arriba.
    return b.created_at.localeCompare(a.created_at);
  });
}

export interface TagSection {
  tag: Tag;
  items: Entry[];
}

export interface DaySection {
  day: DayGroup;
  /** Sin etiqueta: se muestran sueltas, ya ordenadas. */
  loose: Entry[];
  /** Con etiqueta: una sección plegable por etiqueta con contenido. */
  tagged: TagSection[];
}

export function groupForHome(
  entries: Entry[],
  tags: Tag[],
  /** Con el ajuste desactivado, todo va suelto y no se pliega nada. */
  groupByTag: boolean = true
): DaySection[] {
  const dayOrder: DayGroup[] = ['today', 'yesterday', 'older'];
  const byDay = new Map<DayGroup, Entry[]>();

  for (const entry of entries) {
    const day = dayGroup(new Date(entry.created_at));
    const list = byDay.get(day) ?? [];
    list.push(entry);
    byDay.set(day, list);
  }

  return dayOrder
    .filter((day) => byDay.has(day))
    .map((day) => {
      const dayEntries = byDay.get(day)!;

      if (!groupByTag) {
        return { day, loose: sortEntries(dayEntries), tagged: [] };
      }

      const loose = dayEntries.filter((e) => e.tag_id === null);
      const tagged = tags
        .map((tag) => ({
          tag,
          items: sortEntries(dayEntries.filter((e) => e.tag_id === tag.id)),
        }))
        // Una etiqueta sin nada ese día no pinta una fila vacía.
        .filter((section) => section.items.length > 0);

      return { day, loose: sortEntries(loose), tagged };
    });
}

/**
 * Los vecinos entre los que una entrada puede reordenarse: mismo día, misma
 * etiqueta y misma prioridad. Arrastrar nunca cambia de grupo.
 */
export function reorderableSiblings(entries: Entry[], entry: Entry): Entry[] {
  return sortEntries(
    entries.filter(
      (candidate) =>
        candidate.tag_id === entry.tag_id &&
        candidate.priority === entry.priority &&
        dayGroup(new Date(candidate.created_at)) ===
          dayGroup(new Date(entry.created_at))
    )
  );
}

/**
 * Devuelve las posiciones a guardar tras mover `fromIndex` a `toIndex` dentro
 * de sus vecinos. Se reescriben todas para que queden 0..n-1 sin huecos.
 */
export function positionsAfterMove(
  siblings: Entry[],
  fromIndex: number,
  toIndex: number
): { id: string; position: number }[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= siblings.length ||
    toIndex >= siblings.length
  ) {
    return [];
  }

  const next = [...siblings];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);

  return next.map((entry, index) => ({ id: entry.id, position: index }));
}
