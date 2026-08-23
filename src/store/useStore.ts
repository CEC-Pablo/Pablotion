/**
 * El prototipo tenía todo el estado en un solo componente. Aquí se separa en
 * store + persistencia: la base es la fuente de verdad y el store es un caché
 * en memoria que se repuebla desde ella tras cada escritura.
 *
 * `open` y `enter` del prototipo son estado de UI y **no** viven aquí ni en la
 * base: se quedan en el componente que los usa.
 */

import { create } from 'zustand';

import {
  positionsAfterMove,
  reorderableSiblings,
} from '../features/capture/ordering';
import * as calendar from '../lib/calendar';
import * as db from '../lib/db/queries';
import { cancelForEntry, reconcileAll } from '../lib/notifications';
import type {
  CustomUnit,
  Entry,
  EntryType,
  Frequency,
  NotificationRule,
  Priority,
  Tag,
} from '../types';

export interface Settings {
  /** Detección de tipo al escribir. Desactivada, todo entra como nota. */
  detect: boolean;
  sound: boolean;
  digest: boolean;
  dnd: boolean;
  theme: 'dark' | 'system';
  /** Los tres pasos de bienvenida solo se ven una vez. */
  onboarded: boolean;
  /**
   * En Inicio, las entradas con etiqueta se apartan a una sección plegable
   * por etiqueta en vez de mezclarse con el resto.
   */
  groupByTag: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  detect: true,
  sound: true,
  digest: false,
  dnd: false,
  theme: 'dark',
  onboarded: false,
  groupByTag: true,
};

/** Lo que el ReminderCreator devuelve al pulsar «Listo». */
export interface ReminderConfig {
  dueAt: Date;
  frequency: Frequency;
  weeklyDay: number | null;
  customInterval: number | null;
  customUnit: CustomUnit | null;
  /** Independiente de `frequency` y combinable con cualquiera — §3.1. */
  relativeOffsetMinutes: number | null;
  /** Guardar también un evento en el calendario del teléfono. */
  syncToCalendar: boolean;
}

interface Store {
  ready: boolean;
  entries: Entry[];
  tags: Tag[];
  counts: Record<string, number>;
  rules: Record<string, NotificationRule[]>;
  settings: Settings;
  toast: string | null;

  load: () => Promise<void>;
  refresh: () => Promise<void>;

  addEntry: (input: {
    type: EntryType;
    title: string;
    tag_id?: string | null;
  }) => Promise<Entry>;
  patchEntry: (
    id: string,
    patch: Partial<Pick<Entry, 'type' | 'title' | 'body' | 'tag_id' | 'priority'>>
  ) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  /** Borrado en lote desde el modo selección. */
  removeEntries: (ids: string[]) => Promise<void>;
  /** Asigna (o quita, con null) la misma etiqueta a varias entradas. */
  assignTag: (ids: string[], tagId: string | null) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  /**
   * Marca hecho o pendiente cualquier entrada, no solo tareas: es lo que
   * detiene un recordatorio insistente.
   */
  setCompleted: (id: string, completed: boolean) => Promise<void>;
  toggleSubtask: (entryId: string, subtaskId: string) => Promise<void>;
  /**
   * Mueve una entrada `steps` posiciones dentro de sus vecinos — mismo día,
   * misma etiqueta, misma prioridad. Arrastrar nunca la saca de su grupo.
   */
  moveEntry: (entryId: string, steps: number) => Promise<void>;

  saveReminder: (entryId: string, config: ReminderConfig) => Promise<void>;
  clearReminder: (entryId: string) => Promise<void>;

  updateTag: (id: string, patch: { name?: string; color?: string }) => Promise<void>;
  removeTag: (id: string) => Promise<void>;
  /** Devuelve la etiqueta creada, o `null` si ya hay seis. */
  addTag: (name: string, color: string) => Promise<Tag | null>;

  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
  showToast: (message: string) => void;
  hideToast: () => void;
}

export const useStore = create<Store>((set, get) => ({
  ready: false,
  entries: [],
  tags: [],
  counts: {},
  rules: {},
  settings: DEFAULT_SETTINGS,
  toast: null,

  load: async () => {
    const raw = await db.readSettings();
    const settings: Settings = {
      detect: raw.detect ? raw.detect === '1' : DEFAULT_SETTINGS.detect,
      sound: raw.sound ? raw.sound === '1' : DEFAULT_SETTINGS.sound,
      digest: raw.digest ? raw.digest === '1' : DEFAULT_SETTINGS.digest,
      dnd: raw.dnd ? raw.dnd === '1' : DEFAULT_SETTINGS.dnd,
      theme: raw.theme === 'system' ? 'system' : 'dark',
      onboarded: raw.onboarded === '1',
      groupByTag: raw.groupByTag ? raw.groupByTag === '1' : DEFAULT_SETTINGS.groupByTag,
    };
    set({ settings });
    await get().refresh();
    set({ ready: true });
  },

  refresh: async () => {
    const [entries, tags, counts] = await Promise.all([
      db.listEntries(),
      db.listTags(),
      db.tagCounts(),
    ]);

    const rules: Record<string, NotificationRule[]> = {};
    for (const entry of entries) {
      if (entry.due_at) rules[entry.id] = await db.listRules(entry.id);
    }

    set({ entries, tags, counts, rules });
  },

  addEntry: async ({ type, title, tag_id }) => {
    const entry = await db.createEntry({ type, title, tag_id: tag_id ?? null });
    set({ entries: [entry, ...get().entries] });
    return entry;
  },

  patchEntry: async (id, patch) => {
    await db.updateEntry(id, patch);
    set({
      entries: get().entries.map((e) =>
        e.id === id ? { ...e, ...patch, updated_at: new Date().toISOString() } : e
      ),
    });
  },

  removeEntry: async (id) => {
    // Cancelar antes de borrar: si se borra primero, las reglas caen por
    // cascada y nos quedamos sin los identificadores que hay que cancelar.
    await cancelForEntry(id);
    await db.deleteEntry(id);
    set({ entries: get().entries.filter((e) => e.id !== id) });
    await get().refresh();
  },

  removeEntries: async (ids) => {
    // Cancelar antes de borrar en todos: si se borra primero, las reglas caen
    // por cascada y se pierden los identificadores que hay que cancelar.
    for (const id of ids) {
      await cancelForEntry(id);
      await db.deleteEntry(id);
    }
    set({ entries: get().entries.filter((e) => !ids.includes(e.id)) });
    await get().refresh();
  },

  assignTag: async (ids, tagId) => {
    for (const id of ids) {
      await db.updateEntry(id, { tag_id: tagId });
    }
    set({
      entries: get().entries.map((e) =>
        ids.includes(e.id) ? { ...e, tag_id: tagId } : e
      ),
    });
    await get().refresh();
  },

  toggleTask: async (id) => {
    const entry = get().entries.find((e) => e.id === id);
    if (!entry) return;
    await get().setCompleted(id, !entry.completed);
  },

  setCompleted: async (id, completed) => {
    await db.updateEntry(id, { completed });
    set({
      entries: get().entries.map((e) => (e.id === id ? { ...e, completed } : e)),
    });

    if (completed) {
      // Al completar: desactivar y cancelar de inmediato, sin esperar a la
      // reconciliación, para que no llegue el aviso de algo ya tachado.
      await db.setRulesActive(id, false);
      await cancelForEntry(id);
    } else {
      // Al desmarcar, reprogramar si la fecha sigue en el futuro.
      await db.setRulesActive(id, true);
      await reconcileAll();
    }
    await get().refresh();
  },

  toggleSubtask: async (entryId, subtaskId) => {
    const entry = get().entries.find((e) => e.id === entryId);
    const subtask = entry?.subtasks.find((s) => s.id === subtaskId);
    if (!subtask) return;

    const completed = !subtask.completed;
    await db.setSubtaskCompleted(subtaskId, completed);
    set({
      entries: get().entries.map((e) =>
        e.id !== entryId
          ? e
          : {
              ...e,
              subtasks: e.subtasks.map((s) =>
                s.id === subtaskId ? { ...s, completed } : s
              ),
            }
      ),
    });
  },

  moveEntry: async (entryId, steps) => {
    if (steps === 0) return;

    const entries = get().entries;
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;

    const siblings = reorderableSiblings(entries, entry);
    const from = siblings.findIndex((e) => e.id === entryId);
    const to = Math.min(siblings.length - 1, Math.max(0, from + steps));

    const updates = positionsAfterMove(siblings, from, to);
    if (updates.length === 0) return;

    for (const update of updates) {
      await db.updateEntry(update.id, { position: update.position });
    }

    const byId = new Map(updates.map((u) => [u.id, u.position]));
    set({
      entries: entries.map((e) =>
        byId.has(e.id) ? { ...e, position: byId.get(e.id)! } : e
      ),
    });
  },

  saveReminder: async (entryId, config) => {
    await db.updateEntry(entryId, { due_at: config.dueAt.toISOString() });

    await db.upsertRule({
      entry_id: entryId,
      kind: 'primary',
      frequency: config.frequency,
      weekly_day: config.frequency === 'weekly' ? config.weeklyDay : null,
      custom_interval: config.frequency === 'custom' ? config.customInterval : null,
      custom_unit: config.frequency === 'custom' ? config.customUnit : null,
      relative_offset_minutes: null,
      next_trigger_at: null,
      active: true,
    });

    if (config.relativeOffsetMinutes != null) {
      await db.upsertRule({
        entry_id: entryId,
        kind: 'relative',
        frequency: null,
        weekly_day: null,
        custom_interval: null,
        custom_unit: null,
        relative_offset_minutes: config.relativeOffsetMinutes,
        next_trigger_at: null,
        active: true,
      });
    } else {
      await db.deleteRule(entryId, 'relative');
    }

    await syncCalendarEvent(entryId, config, get);

    // Reprogramar de cero cancela lo anterior por identificador: nunca se
    // acumulan notificaciones al reeditar fecha o frecuencia.
    await reconcileAll();
    await get().refresh();
  },

  clearReminder: async (entryId) => {
    const entry = get().entries.find((e) => e.id === entryId);
    if (entry?.calendar_event_id) {
      await calendar.deleteEvent(entry.calendar_event_id);
      await db.updateEntry(entryId, { calendar_event_id: null });
    }
    await cancelForEntry(entryId);
    await db.deleteRule(entryId, 'primary');
    await db.deleteRule(entryId, 'relative');
    await db.updateEntry(entryId, { due_at: null });
    await get().refresh();
  },

  updateTag: async (id, patch) => {
    await db.updateTag(id, patch);
    set({ tags: get().tags.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  },

  removeTag: async (id) => {
    await db.deleteTag(id);
    await get().refresh();
  },

  addTag: async (name, color) => {
    const tag = await db.createTag(name, color);
    if (!tag) return null;
    set({ tags: [...get().tags, tag] });
    await get().refresh();
    return tag;
  },

  setSetting: async (key, value) => {
    const stored = typeof value === 'boolean' ? (value ? '1' : '0') : String(value);
    await db.writeSetting(key, stored);
    set({ settings: { ...get().settings, [key]: value } });
  },

  showToast: (message) => set({ toast: message }),
  hideToast: () => set({ toast: null }),
}));

/**
 * Mantiene el evento del calendario en sintonía con el recordatorio.
 *
 * Que el calendario falle (sin permiso, sin calendario escribible) no puede
 * impedir que el recordatorio se guarde: las funciones de `lib/calendar`
 * devuelven `null`/`false` en vez de lanzar, y aquí simplemente se deja el
 * `calendar_event_id` a null.
 */
async function syncCalendarEvent(
  entryId: string,
  config: ReminderConfig,
  get: () => Store
): Promise<void> {
  const entry = get().entries.find((e) => e.id === entryId);
  if (!entry) return;

  const existingId = entry.calendar_event_id;

  if (!config.syncToCalendar) {
    if (existingId) {
      await calendar.deleteEvent(existingId);
      await db.updateEntry(entryId, { calendar_event_id: null });
    }
    return;
  }

  const granted = await calendar.ensureCalendarPermission();
  if (!granted) return;

  const payload = {
    title: entry.title,
    notes: entry.body,
    startsAt: config.dueAt,
  };

  if (existingId) {
    const updated = await calendar.updateEvent(existingId, payload);
    // El usuario pudo borrar el evento desde la app de calendario; si ya no
    // está, se crea uno nuevo en vez de quedarse con un id muerto.
    if (updated) return;
  }

  const eventId = await calendar.createEvent(payload);
  await db.updateEntry(entryId, { calendar_event_id: eventId });
}
