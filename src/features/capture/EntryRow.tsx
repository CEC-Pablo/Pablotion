/**
 * Fila de ítem de la lista de Inicio.
 *
 * La animación de entrada usa el estado final como estilo por defecto y solo
 * lo anima: si algo fallara, la fila queda visible igual. Es la misma garantía
 * que daba el prototipo al hacerla CSS pura.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Checkbox } from '../../components/Checkbox';
import { Icon, TYPE_ICON } from '../../components/Icon';
import { StrikeText } from '../../components/StrikeText';
import { TagDot } from '../../components/primitives';
import { formatShortDue } from '../../lib/dates';
import { color, layout, motion, radius, type as typography } from '../../theme/tokens';
import type { Entry, Tag } from '../../types';

export function EntryRow({
  entry,
  tag,
  onPress,
  onToggle,
  entering,
}: {
  entry: Entry;
  tag: Tag | undefined;
  onPress: () => void;
  onToggle: () => void;
  /** Recién guardada: fondo `accent-900` que se desvanece. */
  entering?: boolean;
}) {
  const due = entry.due_at ? new Date(entry.due_at) : null;

  return (
    <Animated.View entering={FadeInDown.duration(motion.rowEnter)}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: entering
              ? color.accentRamp[900]
              : pressed
                ? color.neutral[900]
                : 'transparent',
          },
        ]}
      >
        {entry.type === 'task' ? (
          <Checkbox
            checked={entry.completed}
            onToggle={onToggle}
            size={22}
            accessibilityLabel={`Completar ${entry.title}`}
          />
        ) : (
          <View style={styles.iconSlot}>
            <Icon
              name={TYPE_ICON[entry.type]}
              size={18}
              color={entry.type === 'reminder' ? color.accent : color.neutral[600]}
            />
          </View>
        )}

        <View style={styles.textCol}>
          <StrikeText struck={entry.type === 'task' && entry.completed}>
            {entry.title}
          </StrikeText>

          {tag || due ? (
            <View style={styles.meta}>
              {tag ? (
                <View style={styles.metaItem}>
                  <TagDot color={tag.color} />
                  <Text style={styles.metaText}>{tag.name}</Text>
                </View>
              ) : null}
              {due ? (
                <View style={styles.metaItem}>
                  <Icon name="bell" size={11} color={color.neutral[600]} />
                  <Text style={styles.metaText}>{formatShortDue(due)}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: layout.rowPadding,
    borderRadius: radius.md,
  },
  iconSlot: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    ...typography.meta,
    color: color.neutral[600],
  },
});
