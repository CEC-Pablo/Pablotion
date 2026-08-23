/**
 * Fila de ítem de la lista de Inicio.
 *
 * La animación de entrada usa el estado final como estilo por defecto y solo
 * lo anima: si algo fallara, la fila queda visible igual. Es la misma garantía
 * que daba el prototipo al hacerla CSS pura.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeInDown,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Checkbox } from '../../components/Checkbox';
import { Icon, TYPE_ICON } from '../../components/Icon';
import { StrikeText } from '../../components/StrikeText';
import { PriorityDot, TagDot } from '../../components/primitives';
import { formatShortDue } from '../../lib/dates';
import { color, layout, motion, radius, type as typography } from '../../theme/tokens';
import type { Entry, Tag } from '../../types';

/** Altura de referencia mientras la fila no se haya medido. */
const FALLBACK_ROW_HEIGHT = 52;

export function EntryRow({
  entry,
  tag,
  onPress,
  onLongPress,
  onToggle,
  onMove,
  entering,
  selectionMode = false,
  selected = false,
  draggable = false,
}: {
  entry: Entry;
  tag: Tag | undefined;
  onPress: () => void;
  /** Mantener pulsado entra en modo selección. */
  onLongPress?: () => void;
  onToggle: () => void;
  /** Mover N posiciones dentro de sus vecinos. Negativo sube. */
  onMove?: (steps: number) => void;
  /** Recién guardada: fondo `accent-900` que se desvanece. */
  entering?: boolean;
  selectionMode?: boolean;
  selected?: boolean;
  /** El asa solo aparece si hay con quién intercambiarse. */
  draggable?: boolean;
}) {
  const due = entry.due_at ? new Date(entry.due_at) : null;

  // Un recordatorio con fecha también se completa: es lo que detiene uno
  // insistente. Sin fecha sigue siendo solo un aviso y conserva su campana.
  const completable =
    entry.type === 'task' || (entry.type === 'reminder' && due !== null);

  const [rowHeight, setRowHeight] = useState(FALLBACK_ROW_HEIGHT);
  const offsetY = useSharedValue(0);
  const dragging = useSharedValue(0);

  /**
   * El arrastre va **solo desde el asa**, no desde la fila entera: la
   * pulsación larga sobre la fila ya significa «seleccionar», y dos gestos
   * distintos sobre la misma superficie serían una lotería.
   */
  const dragGesture = Gesture.Pan()
    .enabled(draggable && !selectionMode)
    .onBegin(() => {
      dragging.value = 1;
    })
    .onUpdate((event) => {
      offsetY.value = event.translationY;
    })
    .onEnd(() => {
      // Cuántas filas ha recorrido el dedo, redondeando a la más cercana.
      const steps = Math.round(offsetY.value / rowHeight);
      if (steps !== 0 && onMove) runOnJS(onMove)(steps);
      offsetY.value = withTiming(0, { duration: 160 });
    })
    .onFinalize(() => {
      dragging.value = 0;
    });

  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offsetY.value }],
    // La fila levantada se despega del resto mientras se mueve.
    zIndex: dragging.value ? 20 : 0,
    opacity: dragging.value ? 0.92 : 1,
  }));

  return (
    <Animated.View
      entering={FadeInDown.duration(motion.rowEnter)}
      style={dragStyle}
      onLayout={(event) => setRowHeight(event.nativeEvent.layout.height)}
    >
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
          <View style={styles.titleRow}>
            {/* La prioridad se muestra en cualquier tipo, no solo en tareas:
                es lo que decide el orden de toda la lista. */}
            {entry.priority ? <PriorityDot priority={entry.priority} /> : null}
            <StrikeText struck={completable && entry.completed}>
              {entry.title}
            </StrikeText>
          </View>

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

        {draggable && !selectionMode ? (
          <GestureDetector gesture={dragGesture}>
            <View style={styles.handle} accessibilityLabel="Mover">
              <Icon name="dots-six-vertical" size={16} color={color.neutral[700]} />
            </View>
          </GestureDetector>
        ) : null}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  handle: {
    width: 28,
    minHeight: layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: -layout.rowPadding,
  },
});
