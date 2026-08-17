import assert from 'node:assert/strict';
import { test } from 'node:test';

import { detectType } from './detectType';

test('regla 1 — intención explícita de recordatorio', () => {
  assert.equal(detectType('recuérdame llamar al decano'), 'reminder');
  assert.equal(detectType('avísame de la reunión'), 'reminder');
  assert.equal(detectType('no se me olvide el formulario'), 'reminder');
  assert.equal(detectType('poner alarma'), 'reminder');
});

test('regla 1 — tolera la falta de acentos, como ya hacía «avisame»', () => {
  assert.equal(detectType('recuerdame llamar al decano'), 'reminder');
  assert.equal(detectType('avisame de la reunion'), 'reminder');
});

test('regla 2 — palabras de tiempo', () => {
  assert.equal(detectType('reunión hoy'), 'reminder');
  assert.equal(detectType('entregar el ensayo mañana'), 'reminder');
  assert.equal(detectType('asamblea pasado mañana'), 'reminder');
  assert.equal(detectType('el miércoles hay asamblea'), 'reminder');
  assert.equal(detectType('la próxima semana empieza todo'), 'reminder');
});

test('regla 2 — «a las N»', () => {
  assert.equal(detectType('junta a las 9'), 'reminder');
  assert.equal(detectType('ensayo a las 21:30'), 'reminder');
});

test('regla 2 gana a la 3 — el orden importa', () => {
  // «entregar» abre la frase, pero «mañana» se evalúa antes.
  assert.equal(detectType('entregar el informe mañana'), 'reminder');
});

test('regla 3 — verbo de acción solo si abre la frase', () => {
  assert.equal(detectType('comprar leche'), 'task');
  assert.equal(detectType('pagar la matrícula'), 'task');
  assert.equal(detectType('revisar el presupuesto del centro'), 'task');
  // El mismo verbo en medio no convierte la nota en tarea.
  assert.equal(detectType('hay que revisar eso'), 'note');
});

test('regla 4 — todo lo demás es nota', () => {
  assert.equal(detectType('idea para la campaña'), 'note');
  assert.equal(detectType('la beca Santander abre en septiembre'), 'note');
  assert.equal(detectType(''), 'note');
});

test('coincidencia por palabra completa, no por subcadena', () => {
  assert.equal(detectType('el hoyo del patio sigue ahí'), 'note');
  assert.equal(detectType('mañanero'), 'note');
});
