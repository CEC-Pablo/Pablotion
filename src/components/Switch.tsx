/**
 * Interruptor de Ajustes: pista de 46 × 27 px, perilla de 21 px.
 *
 * Apagado: borde `neutral-700`, fondo transparente, perilla `neutral-600`.
 * Encendido: borde acento, fondo `accent-900`, perilla acento.
 */

import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { color, motion } from '../theme/tokens';

const TRACK_WIDTH = 46;
const TRACK_HEIGHT = 27;
const KNOB = 21;
const PADDING = 2;
const TRAVEL = TRACK_WIDTH - KNOB - PADDING * 2;

export function Switch({
  value,
  onChange,
  /** «Guardado automático» va fijo en on al 45 % de opacidad: el brief exige
   *  que no exista botón Guardar, así que el ajuste no se puede apagar. */
  locked = false,
  accessibilityLabel,
}: {
  value: boolean;
  onChange?: (next: boolean) => void;
  locked?: boolean;
  accessibilityLabel?: string;
}) {
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, {
      duration: motion.checkbox,
      easing: Easing.bezier(...motion.ease),
    });
  }, [value, progress]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: progress.value > 0.5 ? color.accentRamp[900] : 'transparent',
    borderColor: progress.value > 0.5 ? color.accent : color.neutral[700],
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * TRAVEL }],
    backgroundColor: progress.value > 0.5 ? color.accent : color.neutral[600],
  }));

  return (
    <Pressable
      onPress={locked ? undefined : () => onChange?.(!value)}
      disabled={locked}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: locked }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 9, bottom: 9, left: 0, right: 0 }}
      style={{ opacity: locked ? 0.45 : 1 }}
    >
      <Animated.View
        style={[
          {
            width: TRACK_WIDTH,
            height: TRACK_HEIGHT,
            borderRadius: 14,
            borderWidth: 1,
            padding: PADDING,
            justifyContent: 'center',
          },
          trackStyle,
        ]}
      >
        <Animated.View
          style={[{ width: KNOB, height: KNOB, borderRadius: KNOB / 2 }, knobStyle]}
        />
      </Animated.View>
    </Pressable>
  );
}
