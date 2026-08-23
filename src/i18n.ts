/**
 * Capa de presentación en español. El modelo y la base de datos van en inglés
 * (§ conflicto 3 del handoff unificado); todo literal visible sale de aquí.
 */

import type { EntryType, Frequency, Priority } from './types';

export const TYPE_LABEL: Record<EntryType, string> = {
  note: 'Nota',
  task: 'Tarea',
  reminder: 'Recordatorio',
};

/** Orden en que se ofrecen los tres tipos, tanto en la captura como en la lista. */
export const TYPE_CYCLE: EntryType[] = ['note', 'task', 'reminder'];

/** Encabezados de los subgrupos de la lista de Inicio. */
export const TYPE_LABEL_PLURAL: Record<EntryType, string> = {
  note: 'Notas',
  task: 'Tareas',
  reminder: 'Recordatorios',
};

/** La prioridad decide el orden de la lista de Inicio. */
export const PRIORITY_LABEL: Record<Priority, string> = {
  high: 'Urgente',
  medium: 'Normal',
  low: 'Puede esperar',
};

/** De más urgente a menos, que es el orden en que se ofrecen. */
export const PRIORITY_CYCLE: Priority[] = ['high', 'medium', 'low'];

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  once: 'Una sola vez',
  daily: 'Diaria',
  weekly: 'Semanal',
  custom: 'Personalizada',
};

/** Iniciales de la fila de días. Índice 0 = lunes, como el diseño. */
export const WEEKDAY_INITIALS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;

/** Meses en minúscula, como los formatea date-fns con locale `es`. */
export const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

/** Nombre completo, índice 0 = lunes. */
export const WEEKDAY_NAMES = [
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
  'domingo',
] as const;

/** Los cuatro chips de desfase, en minutos. */
export const RELATIVE_LABEL: Record<number, string> = {
  60: '1 hora antes',
  180: '3 horas antes',
  1440: 'El día anterior',
  2880: '2 días antes',
};

export const toast = {
  saved: (type: EntryType) => `Guardado como ${TYPE_LABEL[type].toLowerCase()}`,
  scheduled: (when: string) => `Programado para ${when}`,
  synced: (time: string) => `Todo sincronizado, ${time}`,
  deleted: 'Eliminado',
  renaming: (name: string) => `Renombrar «${name}»`,
  tagsKeepText: 'Las notas conservan su texto',
  tagLimit: 'Ocho es el límite, a propósito',
  upToDate: 'Todo al día',
  notificationsDenied: 'Sin permiso de notificaciones. Actívalo en Ajustes del sistema.',
};

/** Saludo de la cabecera de Inicio, según la hora local. */
export function greeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

/** "3 cosas" / "1 cosa" — el contador de los encabezados de grupo. */
export function thingCount(n: number): string {
  return n === 1 ? '1 cosa' : `${n} cosas`;
}

export function resultCount(n: number): string {
  return n === 1 ? '1 resultado' : `${n} resultados`;
}

export function pendingCount(n: number): string {
  return n === 1 ? '1 pendiente' : `${n} pendientes`;
}

export function noteCount(n: number): string {
  return n === 1 ? '1 nota' : `${n} notas`;
}

export function subtaskCount(done: number, total: number): string {
  return `${done}/${total} ${total === 1 ? 'subtarea' : 'subtareas'}`;
}
