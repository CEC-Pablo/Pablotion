/**
 * expo-sqlite es la fuente de verdad en la fase 1 (§3.4: sin cuenta, datos
 * locales). La sincronización con Supabase entra en fase 2 y por eso las
 * tablas ya llevan `updated_at`.
 */

import * as SQLite from 'expo-sqlite';

import { TAG_PALETTE } from '../../theme/tokens';

const DATABASE_NAME = 'trazo.db';
const DATABASE_VERSION = 2;

/** Las seis etiquetas sembradas al instalar. Seis en total, no seis por nota. */
const SEED_TAGS: { name: string; color: string }[] = [
  { name: 'Universidad', color: TAG_PALETTE[0] },
  { name: 'Ideas', color: TAG_PALETTE[1] },
  { name: 'Personal', color: TAG_PALETTE[2] },
  { name: 'Casa', color: TAG_PALETTE[3] },
  { name: 'Centro de Estudiantes', color: TAG_PALETTE[4] },
  { name: 'Salud', color: TAG_PALETTE[5] },
];

/**
 * Migraciones **estrictamente secuenciales**: cada rama deja la base tal como
 * estaba en esa versión y la siguiente la transforma. Una instalación limpia
 * recorre todas las ramas en orden y acaba idéntica a una que venía de antes.
 *
 * Es tentador que la rama 0 cree ya el esquema final y se salte el resto. No lo
 * hagas: si el CREATE TABLE incluye una columna que una migración posterior
 * añade con ALTER, la instalación limpia peta con «duplicate column name», la
 * promesa de `getDb()` queda rechazada y la app se queda en la pantalla de
 * carga para siempre, sin mensaje de error. Ya pasó una vez.
 */
async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  if (version === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';
      PRAGMA foreign_keys = ON;

      CREATE TABLE tags (
        id        TEXT PRIMARY KEY NOT NULL,
        name      TEXT NOT NULL,
        color     TEXT NOT NULL,
        position  INTEGER NOT NULL
      );

      CREATE TABLE entries (
        id          TEXT PRIMARY KEY NOT NULL,
        type        TEXT NOT NULL CHECK (type IN ('note','task','reminder')),
        title       TEXT NOT NULL DEFAULT '',
        body        TEXT NOT NULL DEFAULT '',
        tag_id      TEXT REFERENCES tags(id) ON DELETE SET NULL,
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL,
        due_at      TEXT,
        completed   INTEGER NOT NULL DEFAULT 0,
        priority    TEXT CHECK (priority IN ('high','medium','low'))
      );

      CREATE INDEX idx_entries_created ON entries (created_at DESC);
      CREATE INDEX idx_entries_type    ON entries (type);

      CREATE TABLE subtasks (
        id        TEXT PRIMARY KEY NOT NULL,
        entry_id  TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
        text      TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        position  INTEGER NOT NULL
      );

      CREATE INDEX idx_subtasks_entry ON subtasks (entry_id, position);

      -- Tabla separada, no un objeto embebido: es lo que permite que la regla
      -- relativa sea independiente y combinable con cualquier frecuencia (§3.1).
      CREATE TABLE notification_rules (
        id                      TEXT PRIMARY KEY NOT NULL,
        entry_id                TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
        kind                    TEXT NOT NULL CHECK (kind IN ('primary','relative')),
        frequency               TEXT CHECK (frequency IN ('once','daily','weekly','custom')),
        weekly_day              INTEGER,
        custom_interval         INTEGER,
        custom_unit             TEXT CHECK (custom_unit IN ('days','hours')),
        relative_offset_minutes INTEGER,
        next_trigger_at         TEXT,
        active                  INTEGER NOT NULL DEFAULT 1,
        UNIQUE (entry_id, kind)
      );

      CREATE INDEX idx_rules_entry ON notification_rules (entry_id);

      -- Identificadores devueltos por Expo, para poder cancelar sin duplicar (§6.3).
      CREATE TABLE scheduled_notifications (
        id              TEXT PRIMARY KEY NOT NULL,
        rule_id         TEXT NOT NULL REFERENCES notification_rules(id) ON DELETE CASCADE,
        notification_id TEXT NOT NULL,
        fire_at         TEXT NOT NULL
      );

      CREATE INDEX idx_sched_rule ON scheduled_notifications (rule_id);
      CREATE INDEX idx_sched_fire ON scheduled_notifications (fire_at);

      -- Los interruptores de Ajustes. Clave/valor para no migrar por cada uno.
      CREATE TABLE settings (
        key   TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);

    for (const [i, tag] of SEED_TAGS.entries()) {
      await db.runAsync('INSERT INTO tags (id, name, color, position) VALUES (?, ?, ?, ?)', [
        `tag-${i + 1}`,
        tag.name,
        tag.color,
        i,
      ]);
    }

    version = 1;
  }

  if (version === 1) {
    // Aditiva a propósito: no se recrea la tabla, para no tocar los datos que
    // ya haya. Guarda el id del evento del calendario del teléfono cuando el
    // recordatorio se sincroniza (opcional, por recordatorio).
    await db.execAsync('ALTER TABLE entries ADD COLUMN calendar_event_id TEXT');
    version = 2;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

let handle: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Devuelve la base ya migrada. La promesa se memoiza, así que las migraciones
 * corren una sola vez aunque varias pantallas pidan la base a la vez.
 */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!handle) {
    handle = SQLite.openDatabaseAsync(DATABASE_NAME).then(async (db) => {
      await db.execAsync('PRAGMA foreign_keys = ON');
      await migrate(db);
      return db;
    });
  }
  return handle;
}
