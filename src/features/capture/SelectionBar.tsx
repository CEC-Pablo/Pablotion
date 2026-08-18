/**
 * Barra de acciones del modo selección.
 *
 * Aparece al mantener pulsada una fila y flota sobre la lista, por encima de
 * la barra de pestañas. Dos acciones en lote: mover a una etiqueta y eliminar.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { Icon } from '../../components/Icon';
import { TagDot, Touchable } from '../../components/primitives';
import { color, layout, motion, radius, shadow, type as typography } from '../../theme/tokens';
import type { Tag } from '../../types';

export function SelectionBar({
  count,
  tags,
  onCancel,
  onDelete,
  onAssignTag,
}: {
  count: number;
  tags: Tag[];
  onCancel: () => void;
  onDelete: () => void;
  /** `null` quita la etiqueta de todas las seleccionadas. */
  onAssignTag: (tagId: string | null) => void;
}) {
  const [pickingTag, setPickingTag] = useState(false);

  return (
    <Animated.View
      entering={FadeInDown.duration(motion.toastRise)}
      exiting={FadeOut.duration(160)}
      style={styles.wrap}
    >
      {pickingTag ? (
        <View style={styles.tagRow}>
          {tags.map((tag) => (
            <Pressable
              key={tag.id}
              onPress={() => {
                onAssignTag(tag.id);
                setPickingTag(false);
              }}
              accessibilityRole="button"
              accessibilityLabel={tag.name}
              style={({ pressed }) => [styles.tagOption, { opacity: pressed ? 0.72 : 1 }]}
            >
              <TagDot color={tag.color} size={8} />
              <Text style={styles.tagName}>{tag.name}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => {
              onAssignTag(null);
              setPickingTag(false);
            }}
            accessibilityRole="button"
            accessibilityLabel="Quitar etiqueta"
            style={({ pressed }) => [styles.tagOption, { opacity: pressed ? 0.72 : 1 }]}
          >
            <Text style={[styles.tagName, { color: color.neutral[600] }]}>Sin etiqueta</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.bar}>
        <Touchable onPress={onCancel} accessibilityLabel="Salir de la selección">
          <Icon name="x" size={18} color={color.neutral[400]} />
        </Touchable>

        <Text style={styles.count}>
          {count === 1 ? '1 seleccionada' : `${count} seleccionadas`}
        </Text>

        <Touchable
          onPress={() => setPickingTag(!pickingTag)}
          accessibilityLabel="Mover a una etiqueta"
        >
          <Icon name="tag" size={18} color={color.accent} />
        </Touchable>

        <Touchable onPress={onDelete} accessibilityLabel="Eliminar seleccionadas">
          <Icon name="trash" size={18} color={color.neutral[400]} />
        </Touchable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    gap: 8,
    zIndex: 9,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    minHeight: layout.minTouch + 8,
    borderWidth: 1,
    borderColor: color.accentRamp[700],
    boxShadow: shadow.accentLift,
  },
  count: {
    ...typography.secondary,
    color: color.text,
    flex: 1,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: color.divider,
  },
  tagOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: color.divider,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    minHeight: 36,
  },
  tagName: {
    ...typography.meta,
    fontSize: 12,
    color: color.neutral[300],
  },
});
