/**
 * Regresión de la cadena de migraciones.
 *
 * No se puede importar `expo-sqlite` fuera del dispositivo, así que el test
 * extrae el SQL literal de `index.ts` y lo ejecuta en orden contra el SQLite
 * que trae Node. Eso reproduce exactamente lo que hace una **instalación
 * limpia**: recorrer todas las ramas de versión, una tras otra.
 *
 * El fallo que motiva este test: la rama 0 creaba `entries` ya con
 * `calendar_event_id`, y acto seguido la rama 1 intentaba añadirla con ALTER.
 * SQLite lanzaba «duplicate column name», la promesa de `getDb()` quedaba
 * rechazada y la app se quedaba para siempre en la pantalla de carga.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { test } from 'node:test';

const source = readFileSync(join(import.meta.dirname, 'index.ts'), 'utf8');

/** Todo el SQL del archivo, en orden de aparición. */
function extractSql(): string[] {
  const statements: string[] = [];

  // Bloques `db.execAsync(`...`)` con plantilla.
  for (const match of source.matchAll(/execAsync\(`([\s\S]*?)`\)/g)) {
    statements.push(match[1]);
  }
  // Bloques `db.execAsync('...')` de una línea.
  for (const match of source.matchAll(/execAsync\('([^']*)'\)/g)) {
    statements.push(match[1]);
  }

  return statements
    .map((sql) => sql.trim())
    // `PRAGMA user_version = ${...}` lleva interpolación y no aporta al esquema.
    .filter((sql) => sql.length > 0 && !sql.includes('${'));
}

test('el SQL de las migraciones se extrae del archivo real', () => {
  const sql = extractSql();
  assert.ok(sql.length >= 2, 'no se encontró el SQL de migración');
  assert.ok(
    sql.some((s) => s.includes('CREATE TABLE entries')),
    'falta la creación de entries'
  );
});

test('una instalación limpia recorre todas las ramas sin lanzar', () => {
  const db = new DatabaseSync(':memory:');
  try {
    for (const statement of extractSql()) {
      // Esto es lo que petaba: la rama 1 se ejecuta justo después de la 0.
      db.exec(statement);
    }
  } finally {
    db.close();
  }
});

test('el esquema final tiene calendar_event_id exactamente una vez', () => {
  const db = new DatabaseSync(':memory:');
  try {
    for (const statement of extractSql()) db.exec(statement);

    const columns = db
      .prepare('PRAGMA table_info(entries)')
      .all()
      .map((row) => (row as { name: string }).name);

    assert.equal(
      columns.filter((c) => c === 'calendar_event_id').length,
      1,
      'la columna debe existir una sola vez'
    );
    for (const expected of ['id', 'type', 'title', 'body', 'tag_id', 'due_at']) {
      assert.ok(columns.includes(expected), `falta la columna ${expected}`);
    }
  } finally {
    db.close();
  }
});

test('las seis tablas del modelo existen tras migrar', () => {
  const db = new DatabaseSync(':memory:');
  try {
    for (const statement of extractSql()) db.exec(statement);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => (row as { name: string }).name);

    for (const expected of [
      'tags',
      'entries',
      'subtasks',
      'notification_rules',
      'scheduled_notifications',
      'settings',
    ]) {
      assert.ok(tables.includes(expected), `falta la tabla ${expected}`);
    }
  } finally {
    db.close();
  }
});
