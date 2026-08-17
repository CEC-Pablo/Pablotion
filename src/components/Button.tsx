/**
 * Botones del sistema.
 *
 * Regla de Nocturne: el acento se usa como línea, borde y resplandor, nunca
 * como relleno de áreas grandes. Los botones primarios son **borde de 1 px
 * sobre transparente**, no rellenos sólidos.
 */

import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { color, layout, radius, type as typography } from '../theme/tokens';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost';

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  iconAfter,
  height = layout.minTouch,
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  /** El botón de onboarding lleva `arrow-right` a la derecha. */
  iconAfter?: IconName;
  height?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const tint =
    variant === 'primary'
      ? color.accent
      : variant === 'ghost'
        ? color.neutral[500]
        : color.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          borderColor:
            variant === 'primary'
              ? color.accent
              : variant === 'secondary'
                ? color.divider
                : 'transparent',
          borderWidth: variant === 'ghost' ? 0 : 1,
          opacity: disabled ? 0.45 : pressed ? 0.72 : 1,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        {icon ? <Icon name={icon} size={16} color={tint} /> : null}
        <Text style={[typography.secondary, { color: tint }]}>{label}</Text>
        {iconAfter ? <Icon name={iconAfter} size={16} color={tint} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
