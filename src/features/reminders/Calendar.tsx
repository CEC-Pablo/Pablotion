/**
 * Calendario compacto del ReminderCreator.
 *
 * El prototipo tenía agosto de 2026 fijo con una cuadrícula de 42 celdas.
 * Aquí es aritmética real con date-fns, semana que empieza en lunes y locale
 * `es`, conservando las 42 celdas (6 filas) para que la altura no salte al
 * cambiar de mes.
 *
 * No se permiten fechas pasadas: la validación vive en el propio selector, no
 * solo en la capa de datos.
 */

import {
  addDays,
  addMonths,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../components/Icon';
import { Touchable } from '../../components/primitives';
import { WEEKDAY_INITIALS } from '../../i18n';
import { formatMonthYear, isPastDay } from '../../lib/dates';
import { color, layout, radius, ring, type as typography } from '../../theme/tokens';

const CELLS = 42;

export function Calendar({
  selected,
  onSelect,
  now = new Date(),
}: {
  selected: Date;
  onSelect: (date: Date) => void;
  now?: Date;
}) {
  const [month, setMonth] = useState(() => startOfMonth(selected));

  const days = useMemo(() => {
    const first = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    return Array.from({ length: CELLS }, (_, i) => addDays(first, i));
  }, [month]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Touchable
          size={34}
          onPress={() => setMonth(addMonths(month, -1))}
          accessibilityLabel="Mes anterior"
        >
          <Icon name="caret-left" size={16} color={color.neutral[400]} />
        </Touchable>

        <Text style={styles.monthLabel}>{formatMonthYear(month)}</Text>

        <Touchable
          size={34}
          onPress={() => setMonth(addMonths(month, 1))}
          accessibilityLabel="Mes siguiente"
        >
          <Icon name="caret-right" size={16} color={color.neutral[400]} />
        </Touchable>
      </View>

      <View style={styles.weekdays}>
        {WEEKDAY_INITIALS.map((initial, i) => (
          <Text key={i} style={styles.weekday}>
            {initial}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const outside = !isSameMonth(day, month);
          const past = isPastDay(day, now);
          const isSelected = isSameDay(day, selected);
          const isToday = isSameDay(day, now);

          return (
            <Pressable
              key={day.toISOString()}
              onPress={() => !past && onSelect(day)}
              disabled={past}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: past }}
              accessibilityLabel={day.getDate().toString()}
              style={[
                styles.cell,
                isSelected && {
                  backgroundColor: color.accentRamp[900],
                  borderColor: color.accent,
                },
                past && styles.past,
              ]}
            >
              <Text
                style={[
                  styles.cellText,
                  outside && { color: color.neutral[800] },
                  isSelected && { color: color.accent },
                ]}
              >
                {day.getDate()}
              </Text>
              {isToday && !isSelected ? <View style={styles.todayDot} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 12,
    ...ring.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthLabel: {
    ...typography.body,
    color: color.text,
    textTransform: 'capitalize',
  },
  weekdays: {
    flexDirection: 'row',
    marginTop: 6,
  },
  weekday: {
    ...typography.meta,
    fontSize: 10,
    color: color.neutral[700],
    width: `${100 / 7}%`,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  cell: {
    width: `${100 / 7}%`,
    height: layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cellText: {
    ...typography.secondary,
    color: color.text,
  },
  past: {
    opacity: 0.45,
  },
  todayDot: {
    position: 'absolute',
    bottom: 5,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: color.neutral[600],
  },
});
