/**
 * Chip: el de detección de tipo, los de sugerencia de búsqueda y los de
 * desfase del aviso previo.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, radius, type as typography } from '../theme/tokens';
import { Icon, type IconName } from './Icon';

export function Chip({
  label,
  icon,
  active = false,
  onPress,
  height,
}: {
  label: string;
  icon?: IconName;
  /** Activo: borde y texto en acento. Inactivo: borde divider, `neutral-400`. */
  active?: boolean;
  onPress?: () => void;
  height?: number;
}) {
  const tint = active ? color.accent : color.neutral[400];
  const body = (
    <View style={[styles.chip, height ? { height } : null, { borderColor: active ? color.accent : color.divider }]}>
      {icon ? <Icon name={icon} size={13} color={tint} /> : null}
      <Text style={[typography.meta, { fontSize: 12, color: tint }]}>{label}</Text>
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: radius.md,
  },
});
