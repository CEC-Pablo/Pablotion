/**
 * Todas las lecturas y escrituras pasan por aquí. Las pantallas no hablan SQL.
 */

import type {
  Entry,
  EntryType,
  NotificationRule,
  Priority,
  RuleKind,
  ScheduledNotification,
  Subtask,
  Tag,
} from '../../types';
import { id } from '../id';
import { getDb } from './index';

/* ------------------------------------------------------------------ filas */

interface EntryRow {
  id: string;
  type: EntryType;
  title: string;
  body: string;
  tag_id: string | null;
  created_at: string;
  updated_at: string;
  due_at: string | null;
  completed: number;
  priority: Priority | null;
  calendar_event_id: string | null;
}

interface SubtaskRow {
  id: string;
  entry_id: string;
  text: string;
  completed: number;
  position: number;
}

interface RuleRow extends Omit<NotificationRule, 'active'> {
  active: number;
}

const toEntry = (row: EntryRow, subtasks: Subtask[]): Entry => ({
  ...row,
  completed: row.completed === 1,
  subtasks,
});

const toSubtask = (row: SubtaskRow): Subtask => ({
  ...row,
  completed: row.completed === 1,
});

const toRule = (row: RuleRow): NotificationRule => ({
  ...row,
  active: row.active === 1,
});

/* ---------------------------------------------------------------- entries */

export async function listEntries(): Promise<Entry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<EntryRow>(
    'SELECT * FROM entries ORDER BY created_at DESC'
  );
  const subs = await db.getAllAsync<SubtaskRow>(
    'SELECT * FROM subtasks ORDER BY position ASC'
  );

  const byEntry = new Map<string, Subtask[]>();
  for (const row of subs) {
    const list = byEntry.get(row.entry_id) ?? [];
    list.push(toSubtask(row));
    byEntry.set(row.entry_id, list);
  }

  return rows.map((row) => toEntry(row, byEntry.get(row.id) ?? []));
}

export async function getEntry(entryId: string): Promise<Entry | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<EntryRow>('SELECT * FROM entries WHERE id = ?', [
    entryId,
  ]);
  if (!row) return null;

  const subs = await db.getAllAsync<SubtaskRow>(
    'SELECT * FROM subtasks WHERE entry_id = ? ORDER BY position ASC',
    [entryId]
  );
  return toEntry(row, subs.map(toSubtask));
}

export async function createEntry(input: {
  type: EntryType;
  title: string;
  body?: string;
  tag_id?: string | null;
  due_at?: string | null;
  priority?: Priority | null;
}): Promise<Entry> {
  const db = await getDb();
  const now = new Date().toISOString();
  const entryId = id();

  await db.runAsync(
    `INSERT INTO entries (id, type, title, body, tag_id, created_at, updated_at, due_at, completed, priority)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      entryId,
      input.type,
      input.title,
      input.body ?? '',
      input.tag_id ?? null,
      now,
      now,
      input.due_at ?? null,
      input.priority ?? null,
    ]
  );

  return {
    id: entryId,
    type: input.type,
    title: input.title,
    body: input.body ?? '',
    tag_id: input.tag_id ?? null,
    created_at: now,
    updated_at: now,
    due_at: input.due_at ?? null,
    completed: false,
    priority: input.priority ?? null,
    subtasks: [],
    calendar_event_id: null,
  };
}

type EntryPatch = Partial<
  Pick<
    Entry,
    | 'type'
    | 'title'
    | 'body'
    | 'tag_id'
    | 'due_at'
    | 'completed'
    | 'priority'
    | 'calendar_event_id'
  >
>;

export async function updateEntry(entryId: string, patch: EntryPatch): Promise<void> {
  const keys = Object.keys(patch) as (keyof EntryPatch)[];
  if (keys.length === 0) return;

  const db = await getDb();
  const sets = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => {
    const value = patch[k];
    return typeof value === 'boolean' ? (value ? 1 : 0) : (value ?? null);
  });

  await db.runAsync(`UPDATE entries SET ${sets}, updated_at = ? WHERE id = ?`, [
    ...values,
    new Date().toISOString(),
    entryId,
  ]);
}

/** Las reglas, subtareas y notificaciones caen por ON DELETE CASCADE. */
export async function deleteEntry(entryId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM entries WHERE id = ?', [entryId]);
}

/* --------------------------------------------------------------- subtasks */

export async function addSubtask(entryId: string, text: string): Promise<Subtask> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ next: number }>(
    'SELECT COALESCE(MAX(position) + 1, 0) AS next FROM subtasks WHERE entry_id = ?',
    [entryId]
  );
  const subtask: Subtask = {
    id: id(),
    entry_id: entryId,
    text,
    completed: false,
    position: row?.next ?? 0,
  };

  await db.runAsync(
    'INSERT INTO subtasks (id, entry_id, text, completed, position) VALUES (?, ?, ?, 0, ?)',
    [subtask.id, entryId, text, subtask.position]
  );
  return subtask;
}

export async function setSubtaskCompleted(
  subtaskId: string,
  completed: boolean
): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE subtasks SET completed = ? WHERE id = ?', [
    completed ? 1 : 0,
    subtaskId,
  ]);
}

export async function deleteSubtask(subtaskId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM subtasks WHERE id = ?', [subtaskId]);
}

/* ------------------------------------------------------------------- tags */

export async function listTags(): Promise<Tag[]> {
  const db = await getDb();
  return db.getAllAsync<Tag>('SELECT id, name, color FROM tags ORDER BY position ASC');
}

/** Cuántas entradas usa cada etiqueta, para el contador de la fila. */
export async function tagCounts(): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ tag_id: string; n: number }>(
    'SELECT tag_id, COUNT(*) AS n FROM entries WHERE tag_id IS NOT NULL GROUP BY tag_id'
  );
  return Object.fromEntries(rows.map((r) => [r.tag_id, r.n]));
}

export async function updateTag(
  tagId: string,
  patch: { name?: string; color?: string }
): Promise<void> {
  const keys = Object.keys(patch) as ('name' | 'color')[];
  if (keys.length === 0) return;

  const db = await getDb();
  const sets = keys.map((k) => `${k} = ?`).join(', ');
  await db.runAsync(`UPDATE tags SET ${sets} WHERE id = ?`, [
    ...keys.map((k) => patch[k]!),
    tagId,
  ]);
}

/** Las notas conservan su texto: `entries.tag_id` cae a NULL por la FK. */
export async function deleteTag(tagId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM tags WHERE id = ?', [tagId]);
}

export async function createTag(name: string, color: string): Promise<Tag | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM tags');
  // Seis es el límite, a propósito.
  if ((row?.n ?? 0) >= 6) return null;

  const tag: Tag = { id: id(), name, color };
  await db.runAsync('INSERT INTO tags (id, name, color, position) VALUES (?, ?, ?, ?)', [
    tag.id,
    name,
    color,
    row?.n ?? 0,
  ]);
  return tag;
}

/* ------------------------------------------------------- reglas y horarios */

export async function listRules(entryId: string): Promise<NotificationRule[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RuleRow>(
    'SELECT * FROM notification_rules WHERE entry_id = ?',
    [entryId]
  );
  return rows.map(toRule);
}

export async function listActiveRules(): Promise<NotificationRule[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RuleRow>(
    'SELECT * FROM notification_rules WHERE active = 1 ORDER BY next_trigger_at ASC'
  );
  return rows.map(toRule);
}

/**
 * Una regla por `(entry_id, kind)`. El UNIQUE de la tabla lo garantiza, y el
 * upsert evita acumular reglas huérfanas al reeditar el mismo recordatorio.
 */
export async function upsertRule(
  rule: Omit<NotificationRule, 'id'> & { id?: string }
): Promise<NotificationRule> {
  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM notification_rules WHERE entry_id = ? AND kind = ?',
    [rule.entry_id, rule.kind]
  );
  const ruleId = existing?.id ?? rule.id ?? id();

  await db.runAsync(
    `INSERT INTO notification_rules
       (id, entry_id, kind, frequency, weekly_day, custom_interval, custom_unit,
        relative_offset_minutes, next_trigger_at, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       frequency = excluded.frequency,
       weekly_day = excluded.weekly_day,
       custom_interval = excluded.custom_interval,
       custom_unit = excluded.custom_unit,
       relative_offset_minutes = excluded.relative_offset_minutes,
       next_trigger_at = excluded.next_trigger_at,
       active = excluded.active`,
    [
      ruleId,
      rule.entry_id,
      rule.kind,
      rule.frequency,
      rule.weekly_day,
      rule.custom_interval,
      rule.custom_unit,
      rule.relative_offset_minutes,
      rule.next_trigger_at,
      rule.active ? 1 : 0,
    ]
  );

  return { ...rule, id: ruleId };
}

export async function deleteRule(entryId: string, kind: RuleKind): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM notification_rules WHERE entry_id = ? AND kind = ?', [
    entryId,
    kind,
  ]);
}

export async function setRulesActive(entryId: string, active: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE notification_rules SET active = ? WHERE entry_id = ?', [
    active ? 1 : 0,
    entryId,
  ]);
}

export async function setRuleNextTrigger(
  ruleId: string,
  nextTriggerAt: string | null
): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE notification_rules SET next_trigger_at = ? WHERE id = ?', [
    nextTriggerAt,
    ruleId,
  ]);
}

export async function listScheduled(ruleId: string): Promise<ScheduledNotification[]> {
  const db = await getDb();
  return db.getAllAsync<ScheduledNotification>(
    'SELECT * FROM scheduled_notifications WHERE rule_id = ? ORDER BY fire_at ASC',
    [ruleId]
  );
}

export async function listAllScheduled(): Promise<ScheduledNotification[]> {
  const db = await getDb();
  return db.getAllAsync<ScheduledNotification>(
    'SELECT * FROM scheduled_notifications ORDER BY fire_at ASC'
  );
}

export async function recordScheduled(
  ruleId: string,
  notificationId: string,
  fireAt: string
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO scheduled_notifications (id, rule_id, notification_id, fire_at) VALUES (?, ?, ?, ?)',
    [id(), ruleId, notificationId, fireAt]
  );
}

export async function forgetScheduled(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  const holes = ids.map(() => '?').join(', ');
  await db.runAsync(`DELETE FROM scheduled_notifications WHERE id IN (${holes})`, ids);
}

export async function forgetScheduledForRule(ruleId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM scheduled_notifications WHERE rule_id = ?', [ruleId]);
}

/* --------------------------------------------------------------- ajustes */

export async function readSettings(): Promise<Record<string, string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings'
  );
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function writeSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value]
  );
}
