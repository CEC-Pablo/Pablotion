import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildPreview, type PreviewInput } from './preview';

const NOW = new Date('2026-08-17T08:00:00');
const DUE = new Date('2026-08-18T09:00:00');

const input = (over: Partial<PreviewInput> = {}): PreviewInput => ({
  dueAt: DUE,
  frequency: 'once',
  weeklyDay: null,
  customInterval: null,
  customUnit: null,
  relativeOffsetMinutes: null,
  now: NOW,
  ...over,
});

test('la línea grande usa el formato del diseño', () => {
  assert.equal(buildPreview(input()).headline, 'martes 18 de agosto, 9:00');
});

test('segunda línea por frecuencia', () => {
  assert.equal(buildPreview(input()).repeat, 'Una sola vez. No se repite.');

  assert.equal(
    buildPreview(input({ frequency: 'daily' })).repeat,
    'Después, todos los días a las 9:00.'
  );

  assert.equal(
    // weeklyDay 2 = miércoles (0 = lunes).
    buildPreview(input({ frequency: 'weekly', weeklyDay: 2 })).repeat,
    'Después, cada miércoles a las 9:00.'
  );

  assert.equal(
    buildPreview(
      input({ frequency: 'custom', customInterval: 3, customUnit: 'days' })
    ).repeat,
    'Después, cada 3 días a las 9:00.'
  );

  assert.equal(
    buildPreview(
      input({ frequency: 'custom', customInterval: 6, customUnit: 'hours' })
    ).repeat,
    'Después, cada 6 horas a las 9:00.'
  );
});

test('«cada 1 días» se dice en singular', () => {
  assert.equal(
    buildPreview(
      input({ frequency: 'custom', customInterval: 1, customUnit: 'days' })
    ).repeat,
    'Después, cada día a las 9:00.'
  );
});

test('sin aviso previo no hay tercera línea', () => {
  assert.equal(buildPreview(input()).relative, null);
});

test('el aviso previo añade la tercera línea', () => {
  assert.equal(
    buildPreview(input({ relativeOffsetMinutes: 60 })).relative,
    '1 hora antes del vencimiento (martes 18 de agosto, 9:00)'
  );
});

test('el aviso previo se combina con una frecuencia recurrente (§3.1)', () => {
  // El caso que el prototipo hacía imposible: diaria + 1 hora antes.
  const preview = buildPreview(input({ frequency: 'daily', relativeOffsetMinutes: 60 }));

  assert.equal(preview.repeat, 'Después, todos los días a las 9:00.');
  assert.ok(preview.relative?.startsWith('1 hora antes del vencimiento'));
});

test('la línea grande sigue la primera ocurrencia futura, no la fecha elegida', () => {
  // Una diaria cuya hora de hoy ya pasó apunta al disparo de mañana.
  const preview = buildPreview(
    input({
      dueAt: new Date('2026-08-17T09:00:00'),
      frequency: 'daily',
      now: new Date('2026-08-17T10:00:00'),
    })
  );
  assert.equal(preview.headline, 'martes 18 de agosto, 9:00');
});
