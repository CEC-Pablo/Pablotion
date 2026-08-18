/**
 * FrequencySelector — con el cambio del §3.1 ya aplicado.
 *
 * En el prototipo «Antes del vencimiento» era la quinta fila de un radio group
 * excluyente, así que elegirla deseleccionaba «Diaria» y la combinación era
 * imposible. Aquí:
 *
 *   · las cuatro primeras filas siguen siendo un radio group idéntico;
 *   · el aviso previo pasa a **checkbox independiente**, separado por una
 *     regla que se desvanece y con su propio kicker;
 *   · sus cuatro chips de desfase aparecen al activarlo.
 *
 * Ningún token cambia. Lo que cambia es que «diaria + 1 hora antes» existe.
 */

import { StyleSheet, Text, View } from 'react-native';

import { Checkbox } from '../../components/Checkbox';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { FadingRule, Kicker, Touchable } from '../../components/primitives';
import { FREQUENCY_LABEL, RELATIVE_LABEL, WEEKDAY_INITIALS } from '../../i18n';
import { color, layout, radius, type as typography } from '../../theme/tokens';
import { RELATIVE_OFFSETS, type CustomUnit, type Frequency } from '../../types';

const FREQUENCIES: Frequency[] = ['once', 'daily', 'weekly', 'custom'];
const INDENT = 42;

export interface FrequencyValue {
  frequency: Frequency;
  weeklyDay: number;
  customInterval: number;
  customUnit: CustomUnit;
  relativeOffsetMinutes: number | null;
}

export function FrequencySelector({
  value,
  onChange,
}: {
  value: FrequencyValue;
  onChange: (next: FrequencyValue) => void;
}) {
  const patch = (next: Partial<FrequencyValue>) => onChange({ ...value, ...next });

  return (
    <View>
      <Kicker style={styles.sectionKicker}>Frecuencia</Kicker>

      {FREQUENCIES.map((frequency) => {
        const selected = value.frequency === frequency;
        return (
          <View key={frequency}>
            <Touchable
              onPress={() => patch({ frequency })}
              size={layout.minTouch}
              style={[styles.row, selected && styles.rowSelected]}
              accessibilityLabel={FREQUENCY_LABEL[frequency]}
            >
              <View style={styles.rowInner}>
                <Radio selected={selected} />
                <Text style={[styles.rowLabel, selected && { color: color.text }]}>
                  {FREQUENCY_LABEL[frequency]}
                </Text>
              </View>
            </Touchable>

            {selected && frequency === 'weekly' ? (
              <WeekdayPicker
                value={value.weeklyDay}
                onChange={(weeklyDay) => patch({ weeklyDay })}
              />
            ) : null}

            {selected && frequency === 'custom' ? (
              <>
                <CustomStepper
                  interval={value.customInterval}
                  unit={value.customUnit}
                  onChange={(customInterval, customUnit) =>
                    patch({ customInterval, customUnit })
                  }
                />
                <Text style={styles.hint}>
                  {value.customUnit === 'hours'
                    ? 'Te avisará cada pocas horas hasta que lo marques como hecho.'
                    : 'Toca «días» para cambiar a horas y que insista el mismo día.'}
                </Text>
              </>
            ) : null}
          </View>
        );
      })}

      <FadingRule fade={24} style={styles.separator} />

      <Kicker style={styles.sectionKicker}>Aviso previo</Kicker>

      <View style={styles.row}>
        <View style={styles.rowInner}>
          <Checkbox
            checked={value.relativeOffsetMinutes !== null}
            onToggle={() =>
              patch({
                relativeOffsetMinutes:
                  value.relativeOffsetMinutes === null ? RELATIVE_OFFSETS[0] : null,
              })
            }
            size={22}
            accessibilityLabel="Avisar antes del vencimiento"
          />
          <Text
            style={[
              styles.rowLabel,
              value.relativeOffsetMinutes !== null && { color: color.text },
            ]}
          >
            Antes del vencimiento
          </Text>
        </View>
      </View>

      {value.relativeOffsetMinutes !== null ? (
        <View style={styles.chips}>
          {RELATIVE_OFFSETS.map((offset) => (
            <Chip
              key={offset}
              label={RELATIVE_LABEL[offset]}
              height={layout.minTouch}
              active={value.relativeOffsetMinutes === offset}
              onPress={() => patch({ relativeOffsetMinutes: offset })}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * El hueco central del radio seleccionado es el fondo de la app, no un color
 * nuevo: en CSS era `inset 0 0 0 4px var(--color-bg)`.
 */
function Radio({ selected }: { selected: boolean }) {
  return (
    <View
      style={[
        styles.radio,
        selected && { borderColor: color.accent, backgroundColor: color.bg },
      ]}
    >
      {selected ? <View style={styles.radioDot} /> : null}
    </View>
  );
}

function WeekdayPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (day: number) => void;
}) {
  return (
    <View style={styles.subControl}>
      {WEEKDAY_INITIALS.map((initial, index) => {
        const active = value === index;
        return (
          <Touchable
            key={index}
            size={34}
            onPress={() => onChange(index)}
            accessibilityLabel={initial}
            style={[
              styles.dayCircle,
              active && { borderColor: color.accent },
            ]}
          >
            <Text
              style={[
                typography.secondary,
                { color: active ? color.accent : color.neutral[400] },
              ]}
            >
              {initial}
            </Text>
          </Touchable>
        );
      })}
    </View>
  );
}

function CustomStepper({
  interval,
  unit,
  onChange,
}: {
  interval: number;
  unit: CustomUnit;
  onChange: (interval: number, unit: CustomUnit) => void;
}) {
  const clamp = (n: number) => Math.min(30, Math.max(1, n));

  return (
    <View style={styles.subControl}>
      <Text style={[typography.secondary, { color: color.neutral[400] }]}>Cada</Text>

      <Touchable
        size={34}
        onPress={() => onChange(clamp(interval - 1), unit)}
        accessibilityLabel="Menos"
      >
        <Icon name="minus" size={14} color={color.neutral[400]} />
      </Touchable>

      <Text style={styles.stepperValue}>{interval}</Text>

      <Touchable
        size={34}
        onPress={() => onChange(clamp(interval + 1), unit)}
        accessibilityLabel="Más"
      >
        <Icon name="plus" size={14} color={color.neutral[400]} />
      </Touchable>

      <Touchable
        size={34}
        onPress={() => onChange(interval, unit === 'days' ? 'hours' : 'days')}
        accessibilityLabel="Cambiar unidad"
        style={styles.unitToggle}
      >
        <Text style={[typography.secondary, { color: color.accent }]}>
          {unit === 'days' ? 'días' : 'horas'}
        </Text>
      </Touchable>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionKicker: {
    marginTop: layout.sectionMarginTop,
    marginBottom: 8,
  },
  row: {
    padding: layout.rowPadding,
    borderRadius: radius.md,
    alignItems: 'flex-start',
  },
  rowSelected: {
    backgroundColor: color.surface,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowLabel: {
    ...typography.row,
    color: color.neutral[400],
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: color.neutral[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: color.accent,
  },
  subControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: INDENT,
    paddingBottom: 8,
  },
  dayCircle: {
    borderWidth: 1,
    borderColor: color.divider,
    borderRadius: 17,
  },
  stepperValue: {
    ...typography.row,
    color: color.accent,
    minWidth: 22,
    textAlign: 'center',
  },
  unitToggle: {
    borderWidth: 1,
    borderColor: color.accent,
    borderRadius: radius.md,
    paddingHorizontal: 10,
  },
  hint: {
    ...typography.meta,
    fontSize: 12,
    color: color.neutral[600],
    paddingLeft: INDENT,
    paddingBottom: 10,
  },
  separator: {
    marginTop: 14,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingLeft: INDENT,
    paddingTop: 4,
  },
});
