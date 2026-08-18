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
  onLongPress,
  onToggle,
  entering,
  selectionMode = false,
  selected = false,
}: {
  entry: Entry;
  tag: Tag | undefined;
  onPress: () => void;
  /** Mantener pulsado entra en modo selección. */
  onLongPress?: () => void;
  onToggle: () => void;
  /** Recién guardada: fondo `accent-900` que se desvanece. */
  entering?: boolean;
  selectionMode?: boolean;
  selected?: boolean;
}) {
  const due = entry.due_at ? new Date(entry.due_at) : null;

  // Un recordatorio con fecha también se completa: es lo que detiene uno
  // insistente («cada 3 horas hasta que lo marque»). Sin fecha sigue siendo
  // solo un aviso y conserva su campana.
  const completable = entry.type === 'task' || (entry.type === 'reminder' && due !== null);

  return (
    <Animated.View entering={FadeInDown.duration(motion.rowEnter)}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        style={({ pressed }) => [
          styles.row,
          selected && styles.rowSelected,
          {
            backgroundColor: selected
              ? color.accentRamp[900]
              : entering
                ? color.accentRamp[900]
                : pressed
                  ? color.neutral[900]
                  : 'transparent',
          },
        ]}
      >
        {/* En modo selección el checkbox de la tarea cedería su toque al
            marcado, así que se sustituye por el indicador de selección y
            todas las filas se comportan igual. */}
        {selectionMode ? (
          <View style={styles.iconSlot}>
            <View style={[styles.selectDot, selected && styles.selectDotOn]}>
              {selected ? <Icon name="check" size={12} color={color.bg} /> : null}
            </View>
          </View>
        ) : completable ? (
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
          <StrikeText struck={completable && entry.completed}>
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
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowSelected: {
    borderColor: color.accent,
  },
  selectDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: color.neutral[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectDotOn: {
    backgroundColor: color.accent,
    borderColor: color.accent,
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
