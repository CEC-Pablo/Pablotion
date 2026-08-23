/**
 * Selector de mes y año del calendario.
 *
 * Las flechitas sirven para moverse un mes; para ir a marzo del año que viene
 * son doce toques. Aquí se toca el rótulo «agosto 2026» y aparecen dos
 * columnas que se desplazan, con el valor actual marcado en acento.
 *
 * Sustituye a la rejilla en el mismo hueco en vez de abrir un diálogo encima:
 * la tarjeta no salta de tamaño y el gesto de vuelta es el mismo toque.
 */

import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { FadingRule } from '../../components/primitives';
import { MONTH_NAMES } from '../../i18n';
import { color, layout, radius, type as typography } from '../../theme/tokens';

/** Cuántos años se ofrecen alrededor del actual. */
const YEARS_BACK = 5;
const YEARS_AHEAD = 10;

const OPTION_HEIGHT = layout.minTouch;

export function MonthYearPicker({
  month,
  onSelect,
  today = new Date(),
}: {
  /** Mes actualmente mostrado. */
  month: Date;
  onSelect: (next: Date) => void;
  today?: Date;
}) {
  const currentYear = today.getFullYear();
  const years = Array.from(
    { length: YEARS_BACK + YEARS_AHEAD + 1 },
    (_, i) => currentYear - YEARS_BACK + i
  );

  const monthRef = useRef<ScrollView>(null);
  const yearRef = useRef<ScrollView>(null);

  // Al abrir, cada columna arranca con su valor a la vista en vez de al
  // principio de la lista.
  useEffect(() => {
    const monthOffset = Math.max(0, (month.getMonth() - 2) * OPTION_HEIGHT);
    const yearIndex = years.indexOf(month.getFullYear());
    const yearOffset = Math.max(0, (yearIndex - 2) * OPTION_HEIGHT);

    monthRef.current?.scrollTo({ y: monthOffset, animated: false });
    yearRef.current?.scrollTo({ y: yearOffset, animated: false });
    // Solo al montar: después manda el dedo del usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View entering={FadeIn.duration(180)} style={styles.wrap}>
      <View style={styles.columns}>
        <Column
          ref={monthRef}
          values={MONTH_NAMES.map((name, index) => ({ key: index, label: name }))}
          selected={month.getMonth()}
          onSelect={(index) => onSelect(new Date(month.getFullYear(), index, 1))}
        />

        <View style={styles.divider} />

        <Column
          ref={yearRef}
          values={years.map((year) => ({ key: year, label: String(year) }))}
          selected={month.getFullYear()}
          onSelect={(year) => onSelect(new Date(year, month.getMonth(), 1))}
          align="center"
        />
      </View>

      <FadingRule fade={24} />

      <Pressable
        onPress={() => onSelect(new Date(today.getFullYear(), today.getMonth(), 1))}
        accessibilityRole="button"
        style={({ pressed }) => [styles.todayButton, { opacity: pressed ? 0.72 : 1 }]}
      >
        <Text style={[typography.secondary, { color: color.accent }]}>Volver a hoy</Text>
      </Pressable>
    </Animated.View>
  );
}

interface Option {
  key: number;
  label: string;
}

function Column({
  ref,
  values,
  selected,
  onSelect,
  align = 'left',
}: {
  ref: React.RefObject<ScrollView | null>;
  values: Option[];
  selected: number;
  onSelect: (key: number) => void;
  align?: 'left' | 'center';
}) {
  return (
    <ScrollView
      ref={ref}
      style={styles.column}
      showsVerticalScrollIndicator={false}
      // Cada opción mide justo un área táctil, así que el enganche deja
      // siempre filas completas a la vista.
      snapToInterval={OPTION_HEIGHT}
      decelerationRate="fast"
      contentContainerStyle={styles.columnContent}
    >
      {values.map((option) => {
        const active = option.key === selected;
        return (
          <Pressable
            key={option.key}
            onPress={() => onSelect(option.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            style={({ pressed }) => [
              styles.option,
              active && styles.optionActive,
              { opacity: pressed ? 0.72 : 1 },
            ]}
          >
            <Text
              style={[
                typography.row,
                styles.optionText,
                align === 'center' && { textAlign: 'center' },
                active && { color: color.accent },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  columns: {
    flexDirection: 'row',
    // Seis opciones a la vista: suficiente para orientarse sin comerse la
    // pantalla entera.
    height: OPTION_HEIGHT * 6,
    gap: 12,
  },
  column: {
    flex: 1,
  },
  columnContent: {
    paddingVertical: 2,
  },
  divider: {
    width: 1,
    backgroundColor: color.divider,
  },
  option: {
    height: OPTION_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionActive: {
    backgroundColor: color.accentRamp[900],
    borderColor: color.accent,
  },
  optionText: {
    color: color.neutral[400],
    textTransform: 'capitalize',
  },
  todayButton: {
    minHeight: layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
