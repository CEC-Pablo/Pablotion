import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatHHMM, parseHHMM, withTime } from './dates';

test('parseHHMM acepta las formas que la gente escribe de verdad', () => {
  assert.deepEqual(parseHHMM('9'), { hour: 9, minute: 0 });
  assert.deepEqual(parseHHMM('09:05'), { hour: 9, minute: 5 });
  assert.deepEqual(parseHHMM('9:5'), { hour: 9, minute: 5 });
  assert.deepEqual(parseHHMM('21.30'), { hour: 21, minute: 30 });
  assert.deepEqual(parseHHMM(' 14:37 '), { hour: 14, minute: 37 });
  assert.deepEqual(parseHHMM('0:00'), { hour: 0, minute: 0 });
  assert.deepEqual(parseHHMM('23:59'), { hour: 23, minute: 59 });
});

test('parseHHMM rechaza lo que no es una hora', () => {
  assert.equal(parseHHMM(''), null);
  assert.equal(parseHHMM('24:00'), null);
  assert.equal(parseHHMM('12:60'), null);
  assert.equal(parseHHMM('abc'), null);
  assert.equal(parseHHMM('-1'), null);
});

test('withTime nunca produce una fecha inválida', () => {
  const base = new Date('2026-08-18T00:00:00');

  const ok = withTime(base, 14, 37);
  assert.equal(ok.getHours(), 14);
  assert.equal(ok.getMinutes(), 37);
  assert.equal(ok.getSeconds(), 0);

  // Un dato corrupto acotado en vez de un Invalid Date que reviente al
  // serializar con toISOString().
  for (const bad of [NaN, -5, 99, Infinity]) {
    const result = withTime(base, bad, bad);
    assert.ok(!Number.isNaN(result.getTime()), `withTime(${bad}) dio fecha inválida`);
    assert.doesNotThrow(() => result.toISOString());
  }
});

test('withTime no muta el argumento', () => {
  const base = new Date('2026-08-18T09:00:00');
  const copy = new Date(base);
  withTime(base, 21, 45);
  assert.equal(base.getTime(), copy.getTime());
});

test('formatHHMM rellena con cero a la izquierda', () => {
  assert.equal(formatHHMM(9, 5), '09:05');
  assert.equal(formatHHMM(21, 30), '21:30');
  assert.equal(formatHHMM(0, 0), '00:00');
});
