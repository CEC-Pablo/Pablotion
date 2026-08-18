/**
 * ReminderCreator — la segunda pantalla crítica.
 *
 * Fecha, hora y frecuencia en **una sola pantalla**, sin pasos adicionales.
 * La vista previa se recalcula en vivo: sin debounce y sin botón de confirmar.
 */

import { addDays, startOfDay } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { Icon } from '../../src/components/Icon';
import { Kicker, Touchable } from '../../src/components/primitives';
import { Calendar } from '../../src/features/reminders/Calendar';
import {
  FrequencySelector,
  type FrequencyValue,
} from '../../src/features/reminders/FrequencySelector';
import { PreviewCard } from '../../src/features/reminders/PreviewCard';
import { buildPreview } from '../../src/features/reminders/preview';
import { toast as toastText } from '../../src/i18n';
import { formatFullDate, formatTime, toAppWeekday, withHour } from '../../src/lib/dates';
import { useStore } from '../../src/store/useStore';
import { HOUR_CYCLE, type NotificationRule } from '../../src/types';
import { color, layout, radius, type as typography } from '../../src/theme/tokens';

/** Referencia estable para las entradas que aún no tienen reglas. */
const EMPTY_RULES: NotificationRule[] = [];

export default function ReminderCreator() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const entry = useStore((s) => s.entries.find((e) => e.id === id));
  // El valor por defecto va FUERA del selector a propósito: devolver `[]` desde
  // dentro crea un array nuevo en cada evaluación, y zustand v5 compara
  // snapshots por referencia, así que el render entra en bucle y la pantalla
  // revienta. Solo ocurría al abrir un recordatorio que todavía no existe, que
  // es justo el caso más común.
  const rules = useStore((s) => s.rules[id ?? '']) ?? EMPTY_RULES;
  const saveReminder = useStore((s) => s.saveReminder);
  const showToast = useStore((s) => s.showToast);

  const now = useMemo(() => new Date(), []);

  /** Estado inicial: lo ya guardado, o mañana a las 9:00. */
  const initial = useMemo(() => {
    const primary = rules.find((r) => r.kind === 'primary');
    const relative = rules.find((r) => r.kind === 'relative');
    const due = entry?.due_at ? new Date(entry.due_at) : withHour(addDays(now, 1), 9);

    return {
      date: due,
      hour: due.getHours(),
      frequency: {
        frequency: primary?.frequency ?? 'once',
        weeklyDay: primary?.weekly_day ?? toAppWeekday(due),
        customInterval: primary?.custom_interval ?? 2,
        customUnit: primary?.custom_unit ?? 'days',
        relativeOffsetMinutes: relative?.relative_offset_minutes ?? null,
      } satisfies FrequencyValue,
    };
  }, [entry?.due_at, rules, now]);

  const [date, setDate] = useState(initial.date);
  const [hour, setHour] = useState(initial.hour);
  const [frequency, setFrequency] = useState<FrequencyValue>(initial.frequency);

  const dueAt = withHour(date, hour);

  // Recálculo en vivo: es una función pura y barata, no necesita memo pesado.
  const preview = buildPreview({
    dueAt,
    frequency: frequency.frequency,
    weeklyDay: frequency.weeklyDay,
    customInterval: frequency.customInterval,
    customUnit: frequency.customUnit,
    relativeOffsetMinutes: frequency.relativeOffsetMinutes,
    now,
  });

  const shortcuts = useMemo(
    () => [
      { label: 'Hoy', date: startOfDay(now) },
      { label: 'Mañana', date: startOfDay(addDays(now, 1)) },
      { label: 'Próxima semana', date: startOfDay(addDays(now, 7)) },
    ],
    [now]
  );

  const cycleHour = () => {
    const index = HOUR_CYCLE.indexOf(hour as (typeof HOUR_CYCLE)[number]);
    setHour(HOUR_CYCLE[(index + 1) % HOUR_CYCLE.length]);
  };

  const handleDone = async () => {
    if (!id) return;
    await saveReminder(id, {
      dueAt,
      frequency: frequency.frequency,
      weeklyDay: frequency.weeklyDay,
      customInterval: frequency.customInterval,
      customUnit: frequency.customUnit,
      relativeOffsetMinutes: frequency.relativeOffsetMinutes,
    });
    showToast(toastText.scheduled(formatFullDate(dueAt)));
    router.back();
  };

  return (
    <SafeAreaView style={styles.sheet}>
      <View style={styles.header}>
        <Touchable onPress={() => router.back()} accessibilityLabel="Cerrar">
          <Icon name="x" size={20} color={color.neutral[400]} />
        </Touchable>
        <Text style={styles.title}>Recordatorio</Text>
        <Button label="Listo" onPress={handleDone} height={40} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {entry ? (
          <View style={styles.context}>
            <Icon name="note" size={15} color={color.neutral[500]} />
            <Text style={styles.contextText} numberOfLines={2}>
              {entry.title}
            </Text>
          </View>
        ) : null}

        <Kicker style={styles.kicker}>Fecha de entrega</Kicker>

        <View style={styles.shortcuts}>
          {shortcuts.map((shortcut) => (
            <View key={shortcut.label} style={{ flex: 1 }}>
              <Chip
                label={shortcut.label}
                height={42}
                active={startOfDay(date).getTime() === shortcut.date.getTime()}
                onPress={() => setDate(shortcut.date)}
              />
            </View>
          ))}
        </View>

        <Calendar selected={date} onSelect={setDate} now={now} />

        <View style={styles.hourRow}>
          <View style={styles.hourLabel}>
            <Icon name="clock" size={16} color={color.neutral[400]} />
            <Text style={[typography.body, { color: color.neutral[400] }]}>Hora</Text>
          </View>
          {/* Cicla entre 8:00 · 9:00 · 13:00 · 18:00 · 21:00. No es un time
              picker libre: es una decisión de diseño para reducir pasos. */}
          <Button
            label={formatTime(withHour(date, hour))}
            onPress={cycleHour}
            height={layout.minTouch}
          />
        </View>

        <FrequencySelector value={frequency} onChange={setFrequency} />

        <View style={styles.previewWrap}>
          <PreviewCard preview={preview} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: color.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 10,
  },
  title: {
    ...typography.captureInput,
    fontFamily: typography.preview.fontFamily,
    color: color.text,
  },
  body: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 32,
  },
  context: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: color.neutral[900],
    borderRadius: radius.md,
    padding: 12,
  },
  contextText: {
    ...typography.body,
    color: color.neutral[300],
    flex: 1,
  },
  kicker: {
    marginTop: layout.sectionMarginTop,
    marginBottom: 8,
  },
  shortcuts: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: color.divider,
    marginTop: 12,
    paddingTop: 10,
  },
  hourLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewWrap: {
    marginTop: layout.sectionMarginTop,
  },
});
