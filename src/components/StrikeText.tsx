/**
 * Tachado al completar — momento de deleite nº 3.
 *
 * La línea es una vista absoluta de 1 px que va de `scaleX(0)` a `scaleX(1)`.
 * En CSS el prototipo usa `transform-origin: left`; React Native escala desde
 * el centro, así que hace falta `transformOrigin` explícito (RN 0.74+) o la
 * línea crecería hacia los dos lados.
 *
 * Reversible con las mismas curvas al desmarcar.
 */

import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { color, motion, type as typography } from '../theme/tokens';

const EASE = Easing.bezier(...motion.ease);

export function StrikeText({
  children,
  struck,
  style,
  lineColor = color.neutral[600],
  duration = motion.strike,
}: {
  children: string;
  struck: boolean;
  style?: StyleProp<TextStyle>;
  /** `neutral-700` en subtareas. */
  lineColor?: string;
  /** 240 ms en subtareas, 260 ms en filas. */
  duration?: number;
}) {
  const progress = useSharedValue(struck ? 1 : 0);
  const dim = useSharedValue(struck ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(struck ? 1 : 0, { duration, easing: EASE });
    dim.value = withTiming(struck ? 1 : 0, {
      duration: motion.strikeText,
      easing: EASE,
    });
  }, [struck, duration, progress, dim]);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    // El texto pasa a `neutral-600` en 220 ms, en paralelo con la línea.
    opacity: 1 - dim.value * 0.45,
  }));

  return (
    <View style={styles.wrap}>
      <Animated.Text style={[typography.row, { color: color.text }, style, textStyle]}>
        {children}
      </Animated.Text>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.line,
          { backgroundColor: lineColor, transformOrigin: 'left' },
          lineStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    flexShrink: 1,
  },
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '52%',
    height: 1,
  },
});
