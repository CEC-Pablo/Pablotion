/**
 * Hoja para añadir algo en un día concreto del calendario.
 *
 * Es una ruta y no un trozo de la pestaña Calendario a propósito: así se
 * dibuja **encima**, sin empujar nada, y el mes se queda donde estaba. Antes
 * la tarjeta se abría dentro de la lista y al aparecer el teclado la rejilla
 * del mes salía volando hacia arriba; el resultado era que abrías el compositor
 * y perdías de vista el día que acababas de tocar.
 *
 * El día viaja en la URL como `yyyy-MM-dd` y se interpreta con `parse`, nunca
 * con `new Date('2026-09-02')`: esa forma lo lee como medianoche UTC, y en
 * Chile eso es el día anterior por la tarde. La app entera trabaja en hora
 * local (§6.2) y aquí no se hace una excepción.
 */

import { parse } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  DayComposer,
  SHEET_MAX_HEIGHT_RATIO,
} from '../../src/features/calendar/DayComposer';
import { toast as toastText } from '../../src/i18n';
import { DAY_PARAM_FORMAT, headerDate } from '../../src/lib/dates';
import { useKeyboardLift } from '../../src/lib/useKeyboardLift';
import { useStore } from '../../src/store/useStore';
import { motion, shadow } from '../../src/theme/tokens';

export default function DaySheet() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const lift = useKeyboardLift();

  /**
   * Dos huecos distintos por el mismo borde, y no son intercambiables.
   *
   * El del teclado va **fuera** de la hoja: lo que hay ahí abajo es el teclado
   * en sí, así que la hoja tiene que apartarse entera. El de la barra de
   * navegación del teléfono va **dentro**: la superficie de la hoja sigue
   * llegando hasta el borde de la pantalla —si no, se vería una franja
   * transparente rarísima— y lo que se aparta es solo el contenido, para que
   * el botón «Añadir» no quede debajo de la barra.
   */
  const bottomInset = lift > 0 ? 0 : insets.bottom;

  const tags = useStore((s) => s.tags);
  const detect = useStore((s) => s.settings.detect);
  const addEntryOnDate = useStore((s) => s.addEntryOnDate);
  const showToast = useStore((s) => s.showToast);

  const day = useMemo(() => {
    const parsed = parse(date ?? '', DAY_PARAM_FORMAT, new Date());
    // Una URL manipulada o un parámetro perdido no pueden acabar en un
    // `Invalid Date` que reviente al guardar. Se cae a hoy y ya está.
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [date]);

  const close = () => {
    Keyboard.dismiss();
    router.back();
  };

  return (
    <View style={styles.root}>
      {/* El fondo oscurecido cumple dos funciones: deja ver que el calendario
          sigue ahí detrás, y da una salida sin tener que buscar la X. Su
          fundido lo pone el stack, que ya anima esta ruta con `fade`. */}
      <Pressable
        style={[StyleSheet.absoluteFill, styles.backdrop]}
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel="Cerrar sin añadir nada"
      />

      <Animated.View
        entering={SlideInDown.duration(motion.sheetRise)}
        exiting={SlideOutDown.duration(180)}
        style={[
          styles.sheetWrap,
          {
            maxHeight: windowHeight * SHEET_MAX_HEIGHT_RATIO,
            paddingBottom: lift,
          },
        ]}
      >
        <DayComposer
          day={day}
          dayLabel={headerDate(day)}
          tags={tags}
          detectionEnabled={detect}
          bottomInset={bottomInset}
          onCancel={close}
          onSubmit={(input) => {
            // Se cierra primero y se guarda después: esperar a la base con la
            // hoja abierta daba la sensación de que el botón no había hecho
            // nada. Si la escritura falla, el aviso lo dice.
            Keyboard.dismiss();
            router.back();

            void addEntryOnDate({
              type: input.type,
              title: input.title,
              dueAt: input.dueAt,
              tagId: input.tagId,
            })
              .then(() => showToast(toastText.saved(input.type)))
              .catch((error: unknown) => showToast(`No se pudo guardar: ${String(error)}`));
          }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(11,12,20,0.62)',
  },
  sheetWrap: {
    boxShadow: shadow.lg,
  },
});
