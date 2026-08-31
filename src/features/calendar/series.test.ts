/**
 * Las fechas de una serie repetida.
 *
 * Dos de estos tests existen por errores que la aritmética ingenua comete
 * siempre: el arrastre de los meses cortos y la hora que se mueve sola al
 * cruzar el cambio de horario de verano.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MAX_SERIES_COPIES,
  describeSeries,
  isCapped,
  seriesDates,
} from './series';

/** 1 de septiembre de 2026 a las 9:00, un martes. */
const start = new Date(2026, 8, 1, 9, 0, 0, 0);

test('la fecha elegida es la primera de la serie', () => {
  const dates = seriesDates(start, 'weekly', 3);
  assert.equal(dates[0].getTime(), start.getTime());
});

test('sin repetición no hay serie que describir', () => {
  assert.equal(describeSeries([start], 'weekly'), 'Solo ese día.');
});

test('todos los martes durante tres meses caen en martes', () => {
  const dates = seriesDates(start, 'weekly', 3);

  assert.ok(dates.length >= 13, `salieron ${dates.length}`);
  for (const date of dates) {
    assert.equal(date.getDay(), start.getDay(), `${date.toString()} no es martes`);
  }
});

test('la serie no se pasa del final', () => {
  const dates = seriesDates(start, 'weekly', 3);
  const last = dates[dates.length - 1];
  const limit = new Date(2026, 11, 1, 9, 0, 0, 0);

  assert.ok(last.getTime() <= limit.getTime(), `${last.toString()} se pasa`);
});

test('cada dos semanas salta una', () => {
  const dates = seriesDates(start, 'biweekly', 3);

  for (let i = 1; i < dates.length; i++) {
    const days = Math.round(
      (dates[i].getTime() - dates[i - 1].getTime()) / 86_400_000
    );
    assert.ok(days === 14 || days === 13 || days === 15, `hubo ${days} días`);
  }
});

test('mensual desde el 31 no se va arrastrando', () => {
  // El error clásico: encadenar `addMonths` desde la fecha anterior. El 31 de
  // enero da 28 de febrero, y de ahí saldría 28 de marzo, 28 de abril… La
  // serie se desplaza sola y nunca vuelve al 31. Calculando siempre desde el
  // origen, febrero se ajusta y marzo recupera el 31.
  const enero31 = new Date(2026, 0, 31, 9, 0, 0, 0);
  const dates = seriesDates(enero31, 'monthly', 3);

  assert.equal(dates[0].getMonth(), 0);
  assert.equal(dates[0].getDate(), 31);

  assert.equal(dates[1].getMonth(), 1, 'la segunda debería caer en febrero');
  assert.equal(dates[1].getDate(), 28, 'febrero de 2026 no tiene 31');

  assert.equal(dates[2].getMonth(), 2, 'la tercera debería caer en marzo');
  assert.equal(
    dates[2].getDate(),
    31,
    'marzo tiene 31: la serie no puede quedarse en el 28'
  );
});

test('la hora del reloj se conserva al cruzar el cambio de horario', () => {
  // En Chile el horario de verano entra el primer domingo de septiembre. Una
  // serie semanal que empieza antes tiene que seguir siendo a las 9:00
  // después: si se sumaran 7 × 24 horas en vez de semanas de calendario, las
  // fechas posteriores caerían a las 8:00 o a las 10:00.
  const dates = seriesDates(new Date(2026, 7, 25, 9, 0, 0, 0), 'weekly', 3);

  for (const date of dates) {
    assert.equal(date.getHours(), 9, `${date.toString()} cambió de hora`);
    assert.equal(date.getMinutes(), 0);
  }
});

test('los días seguidos también conservan la hora', () => {
  const dates = seriesDates(new Date(2026, 7, 28, 21, 30, 0, 0), 'daily', 1);

  assert.ok(dates.length >= 28);
  for (const date of dates) {
    assert.equal(date.getHours(), 21, `${date.toString()} cambió de hora`);
    assert.equal(date.getMinutes(), 30);
  }
});

test('un año de días seguidos se corta en el tope, no crea 365 filas', () => {
  const dates = seriesDates(start, 'daily', 12);

  assert.equal(dates.length, MAX_SERIES_COPIES);
  assert.ok(isCapped(dates));
  assert.ok(
    describeSeries(dates, 'daily').includes(String(MAX_SERIES_COPIES)),
    'la vista previa tiene que avisar de que se corta'
  );
});

test('un año de martes cabe entero sin llegar al tope', () => {
  const dates = seriesDates(start, 'weekly', 12);

  assert.ok(dates.length > 50 && dates.length < 55, `salieron ${dates.length}`);
  assert.ok(!isCapped(dates));
});

test('la vista previa dice cuántas, de qué y hasta cuándo', () => {
  const texto = describeSeries(seriesDates(start, 'weekly', 3), 'weekly');

  assert.ok(texto.includes('martes'), texto);
  assert.ok(texto.includes('hasta el'), texto);
  assert.ok(/\d/.test(texto), texto);
});

test('sábado y domingo pluralizan, el resto de los días no', () => {
  // «Todos los sábados», pero «todos los lunes». Es la clase de detalle que,
  // mal puesto, hace que la app parezca traducida con prisa.
  const sabado = new Date(2026, 8, 5, 9, 0, 0, 0);
  assert.ok(describeSeries(seriesDates(sabado, 'weekly', 3), 'weekly').includes('sábados'));

  const lunes = new Date(2026, 8, 7, 9, 0, 0, 0);
  const texto = describeSeries(seriesDates(lunes, 'weekly', 3), 'weekly');
  assert.ok(texto.includes('lunes'), texto);
  assert.ok(!texto.includes('luness'), texto);
});
