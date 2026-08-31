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
    sql.some((s) => /CREATE TABLE (IF NOT EXISTS )?entries/.test(s)),
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

test('la migración 4 añade courses y prompts sin tocar lo anterior', () => {
  const db = new DatabaseSync(':memory:');
  try {
    for (const statement of extractSql()) db.exec(statement);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => (row as { name: string }).name);

    for (const expected of ['courses', 'prompts']) {
      assert.ok(tables.includes(expected), `falta la tabla ${expected}`);
    }
    // Las tablas de antes siguen ahí: la rama 3 es aditiva.
    for (const expected of ['tags', 'entries', 'notification_rules']) {
      assert.ok(tables.includes(expected), `la migración 4 se llevó ${expected}`);
    }
  } finally {
    db.close();
  }
});

test('borrar un ramo se lleva sus prompts', () => {
  // ON DELETE CASCADE y no SET NULL: un prompt sin ramo no tendría dónde
  // aparecer, y quedaría ocupando sitio en la base sin que nadie lo vea.
  const db = new DatabaseSync(':memory:');
  try {
    for (const statement of extractSql()) db.exec(statement);
    db.exec('PRAGMA foreign_keys = ON');

    db.prepare(
      'INSERT INTO courses (id, name, color, position, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run('c1', 'Cálculo III', '#b5abfc', 0, '2026-08-31T10:00:00.000Z');

    const insert = db.prepare(
      `INSERT INTO prompts (id, course_id, label, body, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    insert.run('p1', 'c1', 'Resumen', 'texto largo', 0, 'x', 'x');
    insert.run('p2', 'c1', '', 'otro', 1, 'x', 'x');

    db.prepare('DELETE FROM courses WHERE id = ?').run('c1');

    const left = db.prepare('SELECT COUNT(*) AS n FROM prompts').get() as { n: number };
    assert.equal(left.n, 0, 'los prompts sobrevivieron a su ramo');
  } finally {
    db.close();
  }
});

test('un prompt no tiene tope de longitud', () => {
  // El motivo de la pantalla es pegar prompts largos. Si la columna
  // truncara, el fallo sería silencioso y solo se notaría al pegarlo en el
  // chat y ver que le falta el final.
  const db = new DatabaseSync(':memory:');
  try {
    for (const statement of extractSql()) db.exec(statement);

    db.prepare(
      'INSERT INTO courses (id, name, color, position, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run('c1', 'Álgebra', '#b5abfc', 0, 'x');

    const huge = 'Eres un profesor exigente. '.repeat(2000);
    db.prepare(
      `INSERT INTO prompts (id, course_id, label, body, position, created_at, updated_at)
       VALUES (?, ?, '', ?, 0, 'x', 'x')`
    ).run('p1', 'c1', huge);

    const row = db.prepare('SELECT body FROM prompts WHERE id = ?').get('p1') as {
      body: string;
    };
    assert.equal(row.body.length, huge.length, 'el cuerpo se guardó recortado');
  } finally {
    db.close();
  }
});

test('la migración 5 añade series_id una sola vez, con su índice', () => {
  const db = new DatabaseSync(':memory:');
  try {
    for (const statement of extractSql()) db.exec(statement);

    const columns = db
      .prepare('PRAGMA table_info(entries)')
      .all()
      .map((row) => (row as { name: string }).name);

    assert.equal(
      columns.filter((c) => c === 'series_id').length,
      1,
      'la columna tiene que existir exactamente una vez'
    );

    // El índice no es decoración: borrar una serie es un DELETE por
    // `series_id` y la lista puede tener cientos de entradas.
    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index'")
      .all()
      .map((row) => (row as { name: string }).name);

    assert.ok(indexes.includes('idx_entries_series'), 'falta el índice de series');
  } finally {
    db.close();
  }
});

test('borrar una serie se lleva sus copias y solo esas', () => {
  const db = new DatabaseSync(':memory:');
  try {
    for (const statement of extractSql()) db.exec(statement);

    const insert = db.prepare(
      `INSERT INTO entries (id, type, title, body, created_at, updated_at, completed, series_id)
       VALUES (?, 'task', ?, '', 'x', 'x', 0, ?)`
    );
    insert.run('a1', 'Pastilla', 'serie-1');
    insert.run('a2', 'Pastilla', 'serie-1');
    insert.run('a3', 'Pastilla', 'serie-1');
    insert.run('b1', 'Otra cosa', 'serie-2');
    insert.run('c1', 'Nota suelta', null);

    db.prepare('DELETE FROM entries WHERE series_id = ?').run('serie-1');

    const left = db
      .prepare('SELECT id FROM entries ORDER BY id')
      .all()
      .map((row) => (row as { id: string }).id);

    assert.deepEqual(left, ['b1', 'c1'], 'se llevó por delante lo que no era suyo');
  } finally {
    db.close();
  }
});

/** La SQL con la que se siembran las seis etiquetas, extraída de `runAsync`. */
function seedTagsSql(): string {
  const match = source.match(/runAsync\(\s*'(INSERT[^']*INTO tags[^']*)'/);
  assert.ok(match, 'no se encontró el INSERT de las etiquetas');
  return match![1];
}

/**
 * Ejecuta las migraciones reflejando lo que `migrate()` hace en TypeScript y
 * que no está en la SQL: la guarda `hasColumn` antes de un ALTER, y el bucle
 * que siembra las seis etiquetas. Sin esto el test probaría algo que el código
 * no hace.
 */
function runMigrations(db: DatabaseSync): void {
  for (const statement of extractSql()) {
    const alter = statement.match(/ALTER TABLE (\w+) ADD COLUMN (\w+)/i);

    if (alter) {
      const [, table, column] = alter;
      const exists = db
        .prepare(`PRAGMA table_info(${table})`)
        .all()
        .some((row) => (row as { name: string }).name === column);
      if (exists) continue;
    }

    db.exec(statement);

    // El sembrado va justo después de crear las tablas.
    if (/CREATE TABLE (IF NOT EXISTS )?tags/.test(statement)) {
      const insert = db.prepare(seedTagsSql());
      for (let i = 0; i < 6; i++) {
        insert.run(`tag-${i + 1}`, `Etiqueta ${i + 1}`, '#b5abfc', i);
      }
    }
  }
}

test('reintentar la migración sobre una base ya migrada no lanza', () => {
  // Si una migración futura falla a medias, el siguiente arranque reintenta la
  // rama desde el principio. Tiene que ser inofensivo.
  const db = new DatabaseSync(':memory:');
  try {
    runMigrations(db);
    runMigrations(db);
    runMigrations(db);

    const tags = db.prepare('SELECT COUNT(*) AS n FROM tags').get() as { n: number };
    assert.equal(tags.n, 6, 'la siembra de etiquetas se duplicó al reintentar');

    const columns = db
      .prepare('PRAGMA table_info(entries)')
      .all()
      .map((row) => (row as { name: string }).name);
    assert.equal(columns.filter((c) => c === 'calendar_event_id').length, 1);
  } finally {
    db.close();
  }
});
