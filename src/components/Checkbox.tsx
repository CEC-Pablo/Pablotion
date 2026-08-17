/**
 * Checkbox del sistema. Se dibuja al tamaño pedido pero siempre dentro de un
 * área táctil de 44 px.
 */

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { Easing } from 'react-native-reanimated';

import { color, motion } from '../theme/tokens';
import { Icon } from './Icon';
import { Touchable } from './primitives';

const EASE = Easing.bezier(...motion.ease);

/** 22 px en filas de lista, 24 px en TaskCard, 16 px en subtareas. */
const RADIUS: Record<number, number> = { 16: 5, 22: 6, 24: 7 };

export function Checkbox({
  checked,
  onToggle,
  size = 22,
  accessibilityLabel,
}: {
  checked: boolean;
  onToggle: () => void;
  size?: 16 | 22 | 24;
  accessibilityLabel?: string;
}) {
  const progress = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, {
      duration: motion.checkbox,
      easing: EASE,
    });
  }, [checked, progress]);

  const animated = useAnimatedStyle(() => ({
    backgroundColor: progress.value > 0.5 ? color.accent : 'transparent',
    borderColor: progress.value > 0.5 ? color.accent : color.neutral[700],
    opacity: 0.6 + progress.value * 0.4,
  }));

  return (
    <Touchable
      onPress={onToggle}
      size={size}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: RADIUS[size] ?? 6,
            borderWidth: 1.5,
            alignItems: 'center',
            justifyContent: 'center',
          },
          animated,
        ]}
      >
        {checked ? (
          <Icon name="check" size={size === 16 ? 10 : 13} color={color.bg} />
        ) : null}
      </Animated.View>
    </Touchable>
  );
}
