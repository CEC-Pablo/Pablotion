/**
 * El nombre con que un prompt aparece en la lista de Ramos.
 *
 * Parece trivial y no lo es: es lo único que distingue dos prompts del mismo
 * ramo cuando no les pusiste nombre, que va a ser el caso casi siempre —
 * pegar y salir es todo el gesto.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { charCount, promptTitle } from './i18n';

test('el nombre puesto a mano manda sobre el texto', () => {
  assert.equal(promptTitle('Resumen de PDF', 'Eres un profesor…'), 'Resumen de PDF');
});

test('sin nombre se usa la primera línea con contenido', () => {
  assert.equal(
    promptTitle('', '\n\n   Eres un profesor de cálculo.\nTe voy a pasar un PDF.'),
    'Eres un profesor de cálculo.'
  );
});

test('un prompt pegado desde Windows no arrastra el retorno de carro', () => {
  // \r\n es lo que llega al copiar desde el navegador o desde Word. Si se
  // partiera solo por \n, el título terminaría en un carácter invisible que
  // desplaza el texto y no se ve venir.
  const title = promptTitle('', 'Actúa como tutor\r\nY resume el material');
  assert.equal(title, 'Actúa como tutor');
  assert.ok(!title.includes('\r'), 'quedó un retorno de carro pegado al título');
});

test('una primera línea kilométrica se corta, no rompe la fila', () => {
  const long = 'a'.repeat(200);
  const title = promptTitle('', long);
  assert.ok(title.length <= 61, `el título mide ${title.length}`);
  assert.ok(title.endsWith('…'), 'debería avisar de que sigue');
});

test('un prompt recién creado tiene nombre igualmente', () => {
  // Nace vacío y se abre para pegar dentro; si se sale antes, la fila no
  // puede quedarse sin nada que mostrar.
  assert.equal(promptTitle('', ''), 'Prompt sin título');
  assert.equal(promptTitle('   ', '  \n  '), 'Prompt sin título');
});

test('el contador de caracteres respeta el singular', () => {
  assert.equal(charCount(1), '1 carácter');
  assert.ok(charCount(2400).endsWith('caracteres'));
});
