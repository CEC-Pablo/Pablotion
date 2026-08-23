/**
 * Rejilla mensual de la pestaña Calendario.
 *
 * Distinta del calendario del ReminderCreator: aquí no se eligen fechas
 * futuras, se navega lo que hay. Los días con contenido llevan una fila de
 * puntos con el color de su etiqueta — así el mes se lee de un vistazo sin
 * añadir texto, que es la misma idea que la app usa en las filas de lista.
 */

import {
  addDays,
  addMonths,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../components/Icon';
import { Touchable } from '../../components/primitives';
import { WEEKDAY_INITIALS } from '../../i18n';
import { formatMonthYear } from '../../lib/dates';
import { color, layout, radius, type as typography } from '../../theme/tokens';

const CELLS = 42;
/** Más de tres puntos satura la celda; el resto se resume con uno atenuado. */
const MAX_DOTS = 3;

export interface DayMarks {
  /** Colores de las etiquetas del día, en orden. */
  colors: string[];
  /** Hay además algún evento del calendario del teléfono. */
  hasPhoneEvent: boolean;
}

export function MonthGrid({
  month,
  selected,
  marksFor,
  onSelect,
  onMonthChange,
  today = new Date(),
}: {
  month: Date;
  selected: Date;
  marksFor: (day: Date) => DayMarks;
  onSelect: (day: Date) => void;
  onMonthChange: (month: Date) => void;
  today?: Date;
}) {
  const days = useMemo(() => {
    const first = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    return Array.from({ length: CELLS }, (_, i) => addDays(first, i));
  }, [month]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Touchable
          size={34}
          onPress={() => onMonthChange(addMonths(month, -1))}
          accessibilityLabel="Mes anterior"
        >
          <Icon name="caret-left" size={16} color={color.neutral[400]} />
        </Touchable>

        <Text style={styles.monthLabel}>{formatMonthYear(month)}</Text>

        <Touchable
          size={34}
          onPress={() => onMonthChange(addMonths(month, 1))}
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
          const isSelected = isSameDay(day, selected);
          const isToday = isSameDay(day, today);
          const marks = marksFor(day);
          const extra = Math.max(0, marks.colors.length - MAX_DOTS);

          return (
            <Pressable
              key={day.toISOString()}
              onPress={() => onSelect(day)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={day.getDate().toString()}
              style={[
                styles.cell,
                isSelected && {
                  backgroundColor: color.accentRamp[900],
                  borderColor: color.accent,
                },
              ]}
            >
              <Text
                style={[
                  styles.cellText,
                  outside && { color: color.neutral[800] },
                  isToday && !isSelected && { color: color.accent },
                  isSelected && { color: color.accent },
                ]}
              >
                {day.getDate()}
              </Text>

              <View style={styles.dots}>
                {marks.colors.slice(0, MAX_DOTS).map((dot, i) => (
                  <View
                    key={i}
                    style={[styles.dot, { backgroundColor: dot, opacity: outside ? 0.4 : 1 }]}
                  />
                ))}
                {extra > 0 ? (
                  <View style={[styles.dot, { backgroundColor: color.neutral[700] }]} />
                ) : null}
                {marks.hasPhoneEvent ? (
                  <View
                    style={[
                      styles.dot,
                      styles.phoneDot,
                      { opacity: outside ? 0.4 : 1 },
                    ]}
                  />
                ) : null}
              </View>
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
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: color.neutral[800],
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
  dots: {
    position: 'absolute',
    bottom: 5,
    flexDirection: 'row',
    gap: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  phoneDot: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: color.neutral[500],
  },
});
