/**
 * Primitivas del sistema: la firma visual (reglas que se desvanecen), los
 * puntos de color y el envoltorio que garantiza los 44 px de área táctil.
 */

import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { color, layout, priorityDot, type as typography } from '../theme/tokens';
import type { Priority } from '../types';

/**
 * Las líneas divisorias no terminan en seco: se desvanecen a transparente en
 * los extremos. Es la firma del sistema y no se sustituye por un borde plano.
 *
 * En RN no hay `linear-gradient` en estilos, así que va con expo-linear-gradient.
 */
export function FadingRule({
  fade = 48,
  style,
  oneSided = false,
}: {
  /** Cuánto dura el desvanecimiento en cada extremo. 24 px en el editor. */
  fade?: number;
  style?: StyleProp<ViewStyle>;
  /** Los encabezados de grupo usan un gradiente de un solo lado. */
  oneSided?: boolean;
}) {
  const colors = oneSided
    ? ([color.divider, 'transparent'] as const)
    : (['transparent', color.divider, color.divider, 'transparent'] as const);

  // Las paradas se expresan en fracción; 48 px sobre un ancho típico de 376 px
  // de contenido dan ~0.13. Se aproxima porque RN no admite `calc()`.
  const stop = oneSided ? undefined : ([0, fade / 376, 1 - fade / 376, 1] as const);

  return (
    <LinearGradient
      colors={colors}
      locations={stop as never}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.rule, style]}
    />
  );
}

export function Kicker({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.kicker, style]}>{children}</Text>;
}

export function TagDot({ color: dotColor, size = 6 }: { color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: dotColor,
      }}
    />
  );
}

/** Prioridad: color, nunca texto. Punto de 7 px con borde de 1.5 px. */
export function PriorityDot({ priority }: { priority: Priority }) {
  const spec = priorityDot[priority];
  return (
    <View
      style={{
        width: 7,
        height: 7,
        borderRadius: 3.5,
        borderWidth: 1.5,
        borderColor: spec.border,
        backgroundColor: spec.fill,
      }}
    />
  );
}

/**
 * Botón cuyo elemento pintado puede ser menor que su área táctil.
 *
 * El prototipo lo resolvía con márgenes negativos; aquí se usa `hitSlop`, que
 * amplía el área sin desplazar el layout. Ningún área táctil baja de 44 px.
 */
export function Touchable({
  onPress,
  children,
  size = layout.minTouch,
  style,
  disabled,
  accessibilityLabel,
}: {
  onPress?: () => void;
  children: ReactNode;
  /** Tamaño pintado. El área táctil se completa con hitSlop hasta 44 px. */
  size?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const slop = Math.max(0, (layout.minTouch - size) / 2);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={slop}
      style={({ pressed }) => [
        {
          minWidth: size,
          minHeight: size,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rule: {
    height: 1,
    width: '100%',
  },
  kicker: {
    ...typography.kicker,
    color: color.neutral[600],
  },
});
