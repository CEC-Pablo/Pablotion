/**
 * Modelo canónico del handoff unificado §5.
 *
 * Nombres en inglés en código y base de datos; los literales en español
 * viven solo en la capa de presentación (`src/i18n.ts`).
 */

export type EntryType = 'note' | 'task' | 'reminder';
export type Priority = 'high' | 'medium' | 'low';

export interface Entry {
  id: string;
  type: EntryType;
  /** El `text` del prototipo: contenido principal, una línea. */
  title: string;
  /** Cuerpo largo del NoteEditor, puede ir vacío. */
  body: string;
  /** UNA etiqueta por ítem — ver §3.2. Seis disponibles en total. */
  tag_id: string | null;
  /** ISO 8601. Los grupos "Hoy"/"Ayer" se derivan de aquí, no de cadenas fijas. */
  created_at: string;
  updated_at: string;
  /** ISO 8601 con hora. Solo reminder/task con fecha. */
  due_at: string | null;
  /** Solo task. */
  completed: boolean;
  /** Solo task. */
  priority: Priority | null;
  /** Solo task. */
  subtasks: Subtask[];
}

export interface Subtask {
  id: string;
  entry_id: string;
  text: string;
  completed: boolean;
  position: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export type Frequency = 'once' | 'daily' | 'weekly' | 'custom';
export type CustomUnit = 'days' | 'hours';
export type RuleKind = 'primary' | 'relative';

/**
 * Un Entry puede tener hasta DOS reglas: una principal y una relativa.
 * Son independientes y combinables — ver §3.1.
 */
export interface NotificationRule {
  id: string;
  entry_id: string;
  kind: RuleKind;
  /** Solo si kind = 'primary'. */
  frequency: Frequency | null;
  /**
   * 0 = lunes … 6 = domingo, como el diseño (fila L M X J V S D).
   * OJO: `Date.getDay()` usa 0 = domingo. La conversión ocurre en un
   * único sitio, `src/features/reminders/weekday.ts`.
   */
  weekly_day: number | null;
  /** 1–30. */
  custom_interval: number | null;
  custom_unit: CustomUnit | null;
  /** Solo si kind = 'relative': 60, 180, 1440, 2880. */
  relative_offset_minutes: number | null;
  /** ISO 8601. Primera ocurrencia pendiente: sirve para la UI y para reponer. */
  next_trigger_at: string | null;
  active: boolean;
}

/** Identificadores devueltos por `scheduleNotificationAsync`, para poder cancelar. */
export interface ScheduledNotification {
  id: string;
  rule_id: string;
  /** El identificador que devolvió Expo. */
  notification_id: string;
  fire_at: string;
}

/** Los cuatro desfases del aviso previo, en minutos. */
export const RELATIVE_OFFSETS = [60, 180, 1440, 2880] as const;
export type RelativeOffset = (typeof RELATIVE_OFFSETS)[number];

/** La fila de hora cicla entre estos cinco valores. No es un time picker libre. */
export const HOUR_CYCLE = [8, 9, 13, 18, 21] as const;
