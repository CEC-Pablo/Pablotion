/**
 * Cuánto hay que levantar una hoja anclada al borde inferior para que el
 * teclado no la tape.
 *
 * Parece que debería bastar con sumar la altura del teclado, y no basta:
 * Android tiene dos comportamientos distintos según la versión y según si la
 * app dibuja bajo las barras del sistema. En unos la ventana **se encoge
 * sola** al abrir el teclado, y entonces una vista anclada abajo ya queda por
 * encima sin hacer nada; en otros el teclado **se superpone** y hay que
 * apartarse su altura entera. Sumar siempre dejaría un hueco vacío del tamaño
 * del teclado; no sumar nunca dejaría la hoja escondida debajo.
 *
 * Aquí no se adivina: se mide. Se recuerda la altura de la ventana con el
 * teclado cerrado y se descuenta lo que la ventana ya se haya encogido por su
 * cuenta. Lo que sobra es lo que falta por levantar, y sale 0 en el primer
 * caso y la altura completa en el segundo.
 */

import { useEffect, useRef, useState } from 'react';
import { Keyboard, useWindowDimensions } from 'react-native';

export function useKeyboardLift(): number {
  const { height: windowHeight } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  /**
   * La altura en reposo se toma una sola vez, al montar, y no se actualiza.
   *
   * Es a propósito: si se recalculara al vuelo habría que decidir si un
   * cambio de altura viene del teclado o no, y los dos eventos (el de teclado
   * y el de redimensionado) no llegan en un orden garantizado. Quien usa esto
   * son hojas que se abren con el teclado cerrado, así que el primer valor es
   * el bueno. La app está bloqueada en vertical, de modo que tampoco hay
   * rotaciones que lo invaliden.
   */
  const restHeight = useRef(windowHeight);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (keyboardHeight === 0) return 0;

  const shrunk = Math.max(0, restHeight.current - windowHeight);
  return Math.max(0, keyboardHeight - shrunk);
}
