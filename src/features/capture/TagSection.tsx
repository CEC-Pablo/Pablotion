/**
 * Sección plegable de una etiqueta en Inicio.
 *
 * El objetivo es que entrar a la app no abrume: lo etiquetado se queda
 * recogido detrás de una fila, y lo sueltas cuando quieras verlo. Empieza
 * cerrada a propósito.
 */

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '../../components/Icon';
import { FadingRule, TagDot } from '../../components/primitives';
import { thingCount } from '../../i18n';
import { color, layout, motion, radius, type as typography } from '../../theme/tokens';
import type { Tag } from '../../types';

export function TagSection({
  tag,
  count,
  children,
}: {
  tag: Tag;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const caret = useSharedValue(0);

  useEffect(() => {
    caret.value = withTiming(open ? 180 : 0, {
      duration: motion.tagRow,
      easing: Easing.bezier(...motion.ease),
    });
  }, [open, caret]);

  const caretStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${caret.value}deg` }],
  }));

  return (
    <View style={styles.section}>
      <Pressable
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${tag.name}, ${thingCount(count)}`}
        style={({ pressed }) => [
          styles.head,
          { backgroundColor: pressed ? color.neutral[900] : 'transparent' },
        ]}
      >
        <TagDot color={tag.color} size={8} />
        <Text style={[styles.name, open && { color: color.text }]}>{tag.name}</Text>
        <FadingRule oneSided style={styles.rule} />
        <Text style={styles.count}>{thingCount(count)}</Text>
        <Animated.View style={caretStyle}>
          <Icon name="caret-down" size={13} color={color.neutral[600]} />
        </Animated.View>
      </Pressable>

      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 4,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: layout.rowPadding,
    minHeight: layout.minTouch,
    borderRadius: radius.md,
  },
  name: {
    ...typography.kicker,
    color: color.neutral[500],
  },
  rule: {
    flex: 1,
  },
  count: {
    ...typography.meta,
    color: color.neutral[700],
  },
  body: {
    gap: layout.rowGap,
    paddingTop: 4,
  },
});
