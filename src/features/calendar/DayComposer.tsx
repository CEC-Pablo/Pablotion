/**
 * Añadir algo directamente sobre un día del calendario.
 *
 * Es la tarjeta de captura de Inicio adaptada: mismo gesto, mismos tres tipos
 * a la vista, misma detección automática mientras escribes. Lo único que
 * cambia es que la fecha ya viene dada por el día que tocaste, así que aquí
 * solo se elige la hora.
 */

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Icon, TYPE_ICON } from '../../components/Icon';
import { TagDot, Touchable } from '../../components/primitives';
import { detectType } from '../capture/detectType';
import { TYPE_CYCLE, TYPE_LABEL } from '../../i18n';
import { formatDayMonth, withTime } from '../../lib/dates';
import { TimeRow } from '../reminders/TimeRow';
import {
  color,
  layout,
  motion,
  radius,
  ring,
  type as typography,
} from '../../theme/tokens';
import type { EntryType, Tag } from '../../types';

const EASE = Easing.bezier(...motion.ease);

export function DayComposer({
  day,
  tags,
  detectionEnabled,
  onSubmit,
  onCancel,
}: {
  day: Date;
  tags: Tag[];
  detectionEnabled: boolean;
  onSubmit: (input: {
    type: EntryType;
    title: string;
    dueAt: Date;
    tagId: string | null;
  }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [override, setOverride] = useState<EntryType | null>(null);
  const [tagId, setTagId] = useState<string | null>(null);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);

  const hasText = title.trim().length > 0;
  const detected = detectionEnabled ? detectType(title) : 'note';
  const type = override ?? detected;

  const submitGlow = useSharedValue(0);

  useEffect(() => {
    submitGlow.value = withTiming(hasText ? 1 : 0, {
      duration: motion.detectChip,
      easing: EASE,
    });
  }, [hasText, submitGlow]);

  const submitStyle = useAnimatedStyle(() => ({
    borderColor: submitGlow.value > 0.5 ? color.accent : color.neutral[800],
  }));

  const handleSubmit = () => {
    const text = title.trim();
    if (!text) return;

    onSubmit({ type, title: text, dueAt: withTime(day, hour, minute), tagId });
    setTitle('');
    setOverride(null);
    setTagId(null);
  };

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(140)}
      style={styles.card}
    >
      <View style={styles.head}>
        <Icon name="calendar-blank" size={14} color={color.accent} />
        <Text style={styles.headText}>{formatDayMonth(day)}</Text>
        <View style={{ flex: 1 }} />
        <Touchable size={28} onPress={onCancel} accessibilityLabel="Cancelar">
          <Icon name="x" size={16} color={color.neutral[500]} />
        </Touchable>
      </View>

      <TextInput
        value={title}
        onChangeText={(next) => {
          // Volver a escribir suelta el tipo fijado a mano, igual que en la
          // captura de Inicio.
          if (override !== null) setOverride(null);
          setTitle(next);
        }}
        onSubmitEditing={handleSubmit}
        blurOnSubmit={false}
        returnKeyType="done"
        autoFocus
        placeholder="¿Qué pasa ese día?"
        placeholderTextColor={color.neutral[600]}
        selectionColor={color.accent}
        cursorColor={color.accent}
        style={styles.input}
        accessibilityLabel="Qué añadir"
      />

      <View style={styles.typeRow}>
        {TYPE_CYCLE.map((option) => {
          const active = option === type;
          return (
            <Pressable
              key={option}
              onPress={() => setOverride(option)}
              hitSlop={{ top: 5, bottom: 5, left: 0, right: 0 }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={TYPE_LABEL[option]}
              style={({ pressed }) => [
                styles.typeOption,
                active && { borderColor: color.accent },
                { opacity: pressed ? 0.72 : 1 },
              ]}
            >
              <Icon
                name={TYPE_ICON[option]}
                size={13}
                color={active ? color.accent : color.neutral[600]}
              />
              <Text
                numberOfLines={1}
                style={[styles.typeLabel, active && { color: color.accent }]}
              >
                {TYPE_LABEL[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TimeRow
        hour={hour}
        minute={minute}
        onChange={(nextHour, nextMinute) => {
          setHour(nextHour);
          setMinute(nextMinute);
        }}
      />

      {tags.length > 0 ? (
        <View style={styles.tagRow}>
          {tags.map((tag) => {
            const active = tag.id === tagId;
            return (
              <Pressable
                key={tag.id}
                // Volver a tocarla la quita, como en el editor de nota.
                onPress={() => setTagId(active ? null : tag.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tag.name}
                style={({ pressed }) => [
                  styles.tagOption,
                  active && { borderColor: color.accent },
                  { opacity: pressed ? 0.72 : 1 },
                ]}
              >
                <TagDot color={tag.color} size={7} />
                <Text
                  style={[styles.tagName, active && { color: color.accent }]}
                  numberOfLines={1}
                >
                  {tag.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.microcopy}>
          {type === 'note'
            ? 'Queda con fecha, sin avisar.'
            : 'Te avisará ese día a esa hora.'}
        </Text>
        <Touchable onPress={handleSubmit} disabled={!hasText} accessibilityLabel="Añadir">
          <Animated.View style={[styles.submit, submitStyle]}>
            <Icon
              name="arrow-up"
              size={17}
              color={hasText ? color.accent : color.neutral[700]}
            />
          </Animated.View>
        </Touchable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 10,
    marginTop: 8,
    gap: 4,
    ...ring.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headText: {
    ...typography.kicker,
    color: color.accent,
  },
  input: {
    ...typography.captureInput,
    color: color.text,
    minHeight: 34,
    padding: 0,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: color.divider,
    borderRadius: radius.md,
    paddingHorizontal: 8,
    minHeight: 34,
    flexShrink: 1,
  },
  typeLabel: {
    ...typography.meta,
    fontSize: 12,
    color: color.neutral[600],
    flexShrink: 1,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 4,
  },
  tagOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: color.divider,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    minHeight: 34,
  },
  tagName: {
    ...typography.meta,
    fontSize: 12,
    color: color.neutral[500],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  microcopy: {
    ...typography.meta,
    color: color.neutral[700],
    flexShrink: 1,
  },
  submit: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
