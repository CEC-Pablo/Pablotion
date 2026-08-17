/**
 * Tareas — repasar y completar, con subtareas colapsadas por defecto.
 *
 * `open` (subtareas desplegadas) es estado de UI: vive aquí, no en la base.
 */

import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Checkbox } from '../../src/components/Checkbox';
import { Chip } from '../../src/components/Chip';
import { Icon } from '../../src/components/Icon';
import { StrikeText } from '../../src/components/StrikeText';
import { PriorityDot, TagDot } from '../../src/components/primitives';
import { Toast } from '../../src/components/Toast';
import { pendingCount, subtaskCount } from '../../src/i18n';
import { useStore } from '../../src/store/useStore';
import {
  color,
  layout,
  motion,
  radius,
  ring,
  type as typography,
} from '../../src/theme/tokens';
import type { Entry, Tag } from '../../src/types';

type Filter = 'pending' | 'done';

export default function Tasks() {
  const [filter, setFilter] = useState<Filter>('pending');

  const entries = useStore((s) => s.entries);
  const tags = useStore((s) => s.tags);
  const toggleTask = useStore((s) => s.toggleTask);
  const toggleSubtask = useStore((s) => s.toggleSubtask);
  const toast = useStore((s) => s.toast);
  const hideToast = useStore((s) => s.hideToast);

  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  const allTasks = useMemo(() => entries.filter((e) => e.type === 'task'), [entries]);
  const visible = allTasks.filter((t) =>
    filter === 'pending' ? !t.completed : t.completed
  );
  const pending = allTasks.filter((t) => !t.completed).length;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Tareas</Text>
        <View style={styles.filters}>
          <Chip
            label="Pendientes"
            height={36}
            active={filter === 'pending'}
            onPress={() => setFilter('pending')}
          />
          <Chip
            label="Hechas"
            height={36}
            active={filter === 'done'}
            onPress={() => setFilter('done')}
          />
          <View style={{ flex: 1 }} />
          <Text style={styles.counter}>{pendingCount(pending)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {visible.length === 0 ? (
          <Text style={styles.empty}>Nada por aquí. Disfrútalo.</Text>
        ) : (
          visible.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              tag={task.tag_id ? tagById.get(task.tag_id) : undefined}
              onToggle={() => void toggleTask(task.id)}
              onToggleSubtask={(subtaskId) => void toggleSubtask(task.id, subtaskId)}
            />
          ))
        )}
      </ScrollView>

      <Toast message={toast} onDismiss={hideToast} />
    </SafeAreaView>
  );
}

function TaskCard({
  task,
  tag,
  onToggle,
  onToggleSubtask,
}: {
  task: Entry;
  tag: Tag | undefined;
  onToggle: () => void;
  onToggleSubtask: (subtaskId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const caret = useSharedValue(0);

  useEffect(() => {
    caret.value = withTiming(open ? 180 : 0, {
      duration: motion.checkbox,
      easing: Easing.bezier(...motion.ease),
    });
  }, [open, caret]);

  const caretStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${caret.value}deg` }],
  }));

  const done = task.subtasks.filter((s) => s.completed).length;

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Checkbox
          checked={task.completed}
          onToggle={onToggle}
          size={24}
          accessibilityLabel={`Completar ${task.title}`}
        />

        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            {task.priority ? <PriorityDot priority={task.priority} /> : null}
            <StrikeText struck={task.completed}>{task.title}</StrikeText>
          </View>

          <View style={styles.meta}>
            {tag ? (
              <View style={styles.metaItem}>
                <TagDot color={tag.color} />
                <Text style={styles.metaText}>{tag.name}</Text>
              </View>
            ) : null}

            {task.subtasks.length > 0 ? (
              <Pressable
                onPress={() => setOpen(!open)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                style={styles.metaItem}
              >
                <Text style={styles.metaText}>
                  {subtaskCount(done, task.subtasks.length)}
                </Text>
                <Animated.View style={caretStyle}>
                  <Icon name="caret-down" size={12} color={color.neutral[600]} />
                </Animated.View>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      {open
        ? task.subtasks.map((subtask) => (
            <View key={subtask.id} style={styles.subtaskRow}>
              <Checkbox
                checked={subtask.completed}
                onToggle={() => onToggleSubtask(subtask.id)}
                size={16}
                accessibilityLabel={subtask.text}
              />
              <StrikeText
                struck={subtask.completed}
                duration={motion.subtaskStrike}
                lineColor={color.neutral[700]}
                style={{ ...typography.secondary, color: color.neutral[300] }}
              >
                {subtask.text}
              </StrikeText>
            </View>
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 10,
    gap: 12,
  },
  title: {
    ...typography.screenTitle,
    color: color.text,
  },
  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counter: {
    ...typography.meta,
    fontSize: 12,
    color: color.neutral[600],
  },
  list: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 24,
    gap: layout.rowGap,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: layout.rowPadding,
    ...ring.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardBody: {
    flex: 1,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingLeft: 15,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    ...typography.meta,
    fontSize: 12,
    color: color.neutral[600],
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 48,
    minHeight: layout.minTouch,
  },
  empty: {
    ...typography.body,
    color: color.neutral[600],
    textAlign: 'center',
    padding: 52,
  },
});
