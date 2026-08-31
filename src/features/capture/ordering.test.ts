import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  groupForHome,
  positionsAfterMove,
  priorityRank,
  reorderableSiblings,
  sortEntries,
} from './ordering';
import type { Entry, Priority, Tag } from '../../types';

const TODAY = new Date();
const iso = (d: Date) => d.toISOString();

let seq = 0;
function entry(over: Partial<Entry> = {}): Entry {
  seq += 1;
  return {
    id: `e${seq}`,
    type: 'note',
    title: `Entrada ${seq}`,
    body: '',
    tag_id: null,
    created_at: iso(TODAY),
    updated_at: iso(TODAY),
    due_at: null,
    completed: false,
    priority: null,
    subtasks: [],
    calendar_event_id: null,
    position: 0,
    series_id: null,
    ...over,
  };
}

const tag = (id: string, name: string): Tag => ({ id, name, color: '#b5abfc' });

test('la prioridad manda: urgente arriba, sin prioridad al final', () => {
  const low = entry({ id: 'baja', priority: 'low' });
  const high = entry({ id: 'alta', priority: 'high' });
  const none = entry({ id: 'ninguna', priority: null });
  const medium = entry({ id: 'media', priority: 'medium' });

  const order = sortEntries([low, none, high, medium]).map((e) => e.id);
  assert.deepEqual(order, ['alta', 'media', 'baja', 'ninguna']);
});

test('a igual prioridad manda la posición manual', () => {
  const a = entry({ id: 'a', priority: 'high', position: 2 });
  const b = entry({ id: 'b', priority: 'high', position: 0 });
  const c = entry({ id: 'c', priority: 'high', position: 1 });

  assert.deepEqual(sortEntries([a, b, c]).map((e) => e.id), ['b', 'c', 'a']);
});

test('sin arrastrar nada, lo más reciente arriba', () => {
  const viejo = entry({ id: 'viejo', created_at: '2026-08-01T09:00:00.000Z' });
  const nuevo = entry({ id: 'nuevo', created_at: '2026-08-18T09:00:00.000Z' });

  assert.deepEqual(sortEntries([viejo, nuevo]).map((e) => e.id), ['nuevo', 'viejo']);
});

test('sortEntries no muta el array de entrada', () => {
  const list = [entry({ priority: 'low' }), entry({ priority: 'high' })];
  const before = list.map((e) => e.id);
  sortEntries(list);
  assert.deepEqual(list.map((e) => e.id), before);
});

test('priorityRank hunde lo que no tiene prioridad', () => {
  const ranks: (Priority | null)[] = ['high', 'medium', 'low', null];
  const values = ranks.map(priorityRank);
  assert.deepEqual(values, [...values].sort((a, b) => a - b), 'el orden no es monótono');
});

/* ------------------------------------------------------------- agrupación */

test('las etiquetadas se apartan a su sección; las sueltas quedan arriba', () => {
  const tags = [tag('t1', 'Universidad'), tag('t2', 'Casa')];
  const entries = [
    entry({ id: 'suelta', tag_id: null }),
    entry({ id: 'uni-1', tag_id: 't1' }),
    entry({ id: 'uni-2', tag_id: 't1' }),
    entry({ id: 'casa', tag_id: 't2' }),
  ];

  const [hoy] = groupForHome(entries, tags);
  assert.deepEqual(hoy.loose.map((e) => e.id), ['suelta']);
  assert.deepEqual(hoy.tagged.map((s) => s.tag.id), ['t1', 't2']);
  assert.equal(hoy.tagged[0].items.length, 2);
});

test('una etiqueta sin nada ese día no pinta una fila vacía', () => {
  const tags = [tag('t1', 'Universidad'), tag('t2', 'Casa')];
  const [hoy] = groupForHome([entry({ tag_id: 't1' })], tags);
  assert.deepEqual(hoy.tagged.map((s) => s.tag.id), ['t1']);
});

test('con el ajuste desactivado no se pliega nada', () => {
  const tags = [tag('t1', 'Universidad')];
  const entries = [entry({ id: 'suelta' }), entry({ id: 'con-tag', tag_id: 't1' })];

  const [hoy] = groupForHome(entries, tags, false);
  assert.equal(hoy.tagged.length, 0);
  assert.equal(hoy.loose.length, 2, 'todo debería quedar suelto');
});

test('dentro de una etiqueta la prioridad sigue mandando', () => {
  const tags = [tag('t1', 'Universidad')];
  const entries = [
    entry({ id: 'baja', tag_id: 't1', priority: 'low' }),
    entry({ id: 'alta', tag_id: 't1', priority: 'high' }),
  ];

  const [hoy] = groupForHome(entries, tags);
  assert.deepEqual(hoy.tagged[0].items.map((e) => e.id), ['alta', 'baja']);
});

/* -------------------------------------------------------------- arrastre */

test('los vecinos son mismo día, misma etiqueta y misma prioridad', () => {
  const objetivo = entry({ id: 'objetivo', tag_id: 't1', priority: 'high' });
  const entries = [
    objetivo,
    entry({ id: 'igual', tag_id: 't1', priority: 'high' }),
    entry({ id: 'otra-etiqueta', tag_id: 't2', priority: 'high' }),
    entry({ id: 'otra-prioridad', tag_id: 't1', priority: 'low' }),
    entry({ id: 'sin-etiqueta', tag_id: null, priority: 'high' }),
  ];

  const ids = reorderableSiblings(entries, objetivo).map((e) => e.id);
  assert.deepEqual(ids.sort(), ['igual', 'objetivo']);
});

test('positionsAfterMove reescribe todas las posiciones sin huecos', () => {
  const siblings = [
    entry({ id: 'a', position: 0 }),
    entry({ id: 'b', position: 1 }),
    entry({ id: 'c', position: 2 }),
  ];

  // Mover el último al principio.
  const result = positionsAfterMove(siblings, 2, 0);
  assert.deepEqual(result, [
    { id: 'c', position: 0 },
    { id: 'a', position: 1 },
    { id: 'b', position: 2 },
  ]);
});

test('positionsAfterMove no hace nada si el movimiento es nulo o inválido', () => {
  const siblings = [entry({ id: 'a' }), entry({ id: 'b' })];
  assert.deepEqual(positionsAfterMove(siblings, 1, 1), []);
  assert.deepEqual(positionsAfterMove(siblings, -1, 0), []);
  assert.deepEqual(positionsAfterMove(siblings, 0, 5), []);
});

test('mover al medio deja el orden esperado', () => {
  const siblings = [
    entry({ id: 'a', position: 0 }),
    entry({ id: 'b', position: 1 }),
    entry({ id: 'c', position: 2 }),
  ];
  const ids = positionsAfterMove(siblings, 0, 1).map((r) => r.id);
  assert.deepEqual(ids, ['b', 'a', 'c']);
});
