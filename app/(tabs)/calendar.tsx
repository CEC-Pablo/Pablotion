/**
 * Calendario — ver el mes de un vistazo y lo que cae en cada día.
 *
 * Tres bloques: la rejilla del mes con puntos de color por etiqueta, lo del
 * día seleccionado, y «Más adelante» — lo que tiene fecha pero queda tan
 * lejos que nunca se ve en Inicio y se acaba olvidando.
 */

import { addMonths, isAfter, isSameDay, startOfDay, startOfMonth } from 'date-fns';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, TYPE_ICON } from '../../src/components/Icon';
import { Toast } from '../../src/components/Toast';
import { FadingRule, Kicker, TagDot } from '../../src/components/primitives';
import { DayComposer } from '../../src/features/calendar/DayComposer';
import { MonthGrid, type DayMarks } from '../../src/features/calendar/MonthGrid';
import { MonthYearPicker } from '../../src/features/calendar/MonthYearPicker';
import { thingCount, toast as toastText } from '../../src/i18n';
import { listPhoneEvents, type PhoneEvent } from '../../src/lib/calendar';
import {
  formatDayMonth,
  formatFullDate,
  formatTime,
  headerDate,
} from '../../src/lib/dates';
import { useStore } from '../../src/store/useStore';
import { color, layout, radius, type as typography } from '../../src/theme/tokens';
import type { Entry } from '../../src/types';

/** Qué se considera «lejano» para la sección de abajo. */
const HORIZON_DAYS = 14;

export default function CalendarScreen() {
  const router = useRouter();
  const entries = useStore((s) => s.entries);
  const tags = useStore((s) => s.tags);
  const detect = useStore((s) => s.settings.detect);
  const addEntryOnDate = useStore((s) => s.addEntryOnDate);
  const toast = useStore((s) => s.toast);
  const showToast = useStore((s) => s.showToast);
  const hideToast = useStore((s) => s.hideToast);

  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => startOfMonth(today));
  const [selected, setSelected] = useState(today);
  const [phoneEvents, setPhoneEvents] = useState<PhoneEvent[]>([]);
  const [pickingMonth, setPickingMonth] = useState(false);
  const [composing, setComposing] = useState(false);

  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  /** Solo lo que tiene fecha aparece en un calendario. */
  const dated = useMemo(
    () => entries.filter((e) => e.due_at !== null),
    [entries]
  );

  // Los eventos del teléfono se releen al cambiar de mes. Sin permiso la
  // lista viene vacía y la pantalla sigue funcionando con lo propio.
  useEffect(() => {
    let cancelled = false;
    const from = startOfMonth(addMonths(month, -1));
    const to = startOfMonth(addMonths(month, 2));

    void listPhoneEvents(from, to).then((events) => {
      if (!cancelled) setPhoneEvents(events);
    });

    return () => {
      cancelled = true;
    };
  }, [month]);

  const marksFor = (day: Date): DayMarks => {
    const colors = dated
      .filter((entry) => isSameDay(new Date(entry.due_at!), day))
      .map((entry) =>
        entry.tag_id ? (tagById.get(entry.tag_id)?.color ?? color.accent) : color.accent
      );

    return {
      colors,
      hasPhoneEvent: phoneEvents.some((event) => isSameDay(event.startsAt, day)),
    };
  };

  const dayEntries = dated
    .filter((entry) => isSameDay(new Date(entry.due_at!), selected))
    .sort((a, b) => a.due_at!.localeCompare(b.due_at!));

  const dayEvents = phoneEvents
    .filter((event) => isSameDay(event.startsAt, selected))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  /** Lo que queda más allá del horizonte: fácil de olvidar, difícil de ver. */
  const faraway = useMemo(() => {
    const edge = startOfDay(new Date(today.getTime() + HORIZON_DAYS * 86_400_000));
    return dated
      .filter((entry) => isAfter(new Date(entry.due_at!), edge))
      .sort((a, b) => a.due_at!.localeCompare(b.due_at!))
      .slice(0, 8);
  }, [dated, today]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Kicker>{headerDate(today)}</Kicker>
        <Text style={styles.title}>Calendario</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {pickingMonth ? (
          <View style={styles.pickerCard}>
            <MonthYearPicker
              month={month}
              today={today}
              onSelect={(next) => {
                setMonth(next);
                setPickingMonth(false);
              }}
            />
          </View>
        ) : (
          <MonthGrid
            month={month}
            selected={selected}
            today={today}
            marksFor={marksFor}
            onSelect={setSelected}
            onMonthChange={setMonth}
            onOpenPicker={() => setPickingMonth(true)}
          />
        )}

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Kicker>{isSameDay(selected, today) ? 'Hoy' : formatDayMonth(selected)}</Kicker>
            <FadingRule oneSided style={{ flex: 1 }} />
            <Text style={styles.count}>
              {thingCount(dayEntries.length + dayEvents.length)}
            </Text>
          </View>

          {dayEntries.length === 0 && dayEvents.length === 0 && !composing ? (
            <Text style={styles.empty}>Nada para este día.</Text>
          ) : null}

          {composing ? (
            <DayComposer
              day={selected}
              tags={tags}
              detectionEnabled={detect}
              onCancel={() => setComposing(false)}
              onSubmit={async (input) => {
                await addEntryOnDate({
                  type: input.type,
                  title: input.title,
                  dueAt: input.dueAt,
                  tagId: input.tagId,
                });
                setComposing(false);
                showToast(toastText.saved(input.type));
              }}
            />
          ) : (
            <Pressable
              onPress={() => setComposing(true)}
              accessibilityRole="button"
              accessibilityLabel="Añadir en este día"
              style={({ pressed }) => [
                styles.addRow,
                { opacity: pressed ? 0.72 : 1 },
              ]}
            >
              <Icon name="plus" size={15} color={color.accent} />
              <Text style={[typography.secondary, { color: color.accent }]}>
                Añadir en este día
              </Text>
            </Pressable>
          )}

          {dayEntries.map((entry) => (
            <DatedRow
              key={entry.id}
              entry={entry}
              tagColor={
                entry.tag_id ? tagById.get(entry.tag_id)?.color : undefined
              }
              onPress={() => router.push(`/note/${entry.id}`)}
            />
          ))}

          {dayEvents.map((event) => (
            <View key={event.id} style={styles.eventRow}>
              <View style={styles.phoneDot} />
              <Text style={styles.eventTitle} numberOfLines={1}>
                {event.title}
              </Text>
              <Text style={styles.eventTime}>
                {event.allDay ? 'Todo el día' : formatTime(event.startsAt)}
              </Text>
            </View>
          ))}
        </View>

        {faraway.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Kicker>Más adelante</Kicker>
              <FadingRule oneSided style={{ flex: 1 }} />
            </View>
            <Text style={styles.sectionHint}>
              Con fecha lejana: no aparecen en Inicio, pero siguen ahí.
            </Text>

            {faraway.map((entry) => (
              <DatedRow
                key={entry.id}
                entry={entry}
                tagColor={entry.tag_id ? tagById.get(entry.tag_id)?.color : undefined}
                showFullDate
                onPress={() => router.push(`/note/${entry.id}`)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <Toast message={toast} onDismiss={hideToast} />
    </SafeAreaView>
  );
}

function DatedRow({
  entry,
  tagColor,
  showFullDate = false,
  onPress,
}: {
  entry: Entry;
  tagColor?: string;
  showFullDate?: boolean;
  onPress: () => void;
}) {
  const due = new Date(entry.due_at!);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? color.neutral[900] : 'transparent' },
      ]}
    >
      <Icon
        name={TYPE_ICON[entry.type]}
        size={17}
        color={entry.type === 'reminder' ? color.accent : color.neutral[600]}
      />

      <View style={{ flex: 1, gap: 3 }}>
        <Text
          style={[
            typography.row,
            {
              color: entry.completed ? color.neutral[600] : color.text,
              textDecorationLine: entry.completed ? 'line-through' : 'none',
            },
          ]}
          numberOfLines={2}
        >
          {entry.title}
        </Text>
        {tagColor ? (
          <View style={styles.metaItem}>
            <TagDot color={tagColor} />
            <Text style={styles.metaText}>
              {showFullDate ? formatFullDate(due) : formatTime(due)}
            </Text>
          </View>
        ) : (
          <Text style={styles.metaText}>
            {showFullDate ? formatFullDate(due) : formatTime(due)}
          </Text>
        )}
      </View>
    </Pressable>
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
  },
  title: {
    ...typography.screenTitle,
    color: color.text,
    marginTop: 2,
  },
  body: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 24,
  },
  section: {
    marginTop: layout.sectionMarginTop,
    gap: layout.rowGap,
  },
  pickerCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: color.neutral[800],
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: layout.minTouch,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.accentRamp[700],
    borderRadius: radius.md,
    marginTop: 2,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionHint: {
    ...typography.meta,
    fontSize: 12,
    color: color.neutral[600],
    marginTop: -2,
  },
  count: {
    ...typography.meta,
    color: color.neutral[700],
  },
  empty: {
    ...typography.body,
    color: color.neutral[600],
    paddingVertical: 20,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: layout.rowPadding,
    borderRadius: radius.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    ...typography.meta,
    color: color.neutral[600],
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: layout.rowPadding,
    borderRadius: radius.md,
    minHeight: layout.minTouch,
  },
  phoneDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: color.neutral[500],
  },
  eventTitle: {
    ...typography.body,
    color: color.neutral[300],
    flex: 1,
  },
  eventTime: {
    ...typography.meta,
    color: color.neutral[600],
  },
});
