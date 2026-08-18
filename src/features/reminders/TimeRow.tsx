/**
 * Fila de hora del ReminderCreator.
 *
 * El diseño original ciclaba entre cinco horas fijas para reducir pasos. La
 * idea es buena para el caso rápido y mala como única opción, así que aquí
 * conviven las dos: los cinco atajos siguen a un toque, y debajo hay un campo
 * para escribir cualquier hora.
 */

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { formatHHMM, parseHHMM } from '../../lib/dates';
import {
  color,
  layout,
  radius,
  type as typography,
} from '../../theme/tokens';
import { HOUR_CYCLE } from '../../types';

export function TimeRow({
  hour,
  minute,
  onChange,
}: {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => formatHHMM(hour, minute));

  // Si la hora cambia desde fuera (un atajo), el campo la refleja.
  useEffect(() => {
    setDraft(formatHHMM(hour, minute));
  }, [hour, minute]);

  const parsed = parseHHMM(draft);
  const invalid = draft.trim().length > 0 && parsed === null;

  const handleDraft = (text: string) => {
    setDraft(text);
    // Se aplica en cuanto es válida: sin botón de confirmar, como el resto de
    // la app. Mientras esté a medio escribir simplemente no se aplica nada.
    const next = parseHHMM(text);
    if (next) onChange(next.hour, next.minute);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.label}>
          <Icon name="clock" size={16} color={color.neutral[400]} />
          <Text style={[typography.body, { color: color.neutral[400] }]}>Hora</Text>
        </View>

        <Pressable
          onPress={() => setOpen(!open)}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`Hora: ${formatHHMM(hour, minute)}`}
          style={({ pressed }) => [styles.valueButton, { opacity: pressed ? 0.72 : 1 }]}
        >
          <Text style={[typography.secondary, { color: color.accent }]}>
            {formatHHMM(hour, minute)}
          </Text>
          <Icon name="caret-down" size={13} color={color.accent} />
        </Pressable>
      </View>

      {open ? (
        <View style={styles.panel}>
          <View style={styles.presets}>
            {HOUR_CYCLE.map((preset) => (
              <Chip
                key={preset}
                label={formatHHMM(preset, 0)}
                height={36}
                active={hour === preset && minute === 0}
                onPress={() => onChange(preset, 0)}
              />
            ))}
          </View>

          <View style={styles.manual}>
            <Text style={[typography.secondary, { color: color.neutral[500] }]}>
              Otra hora
            </Text>
            <TextInput
              value={draft}
              onChangeText={handleDraft}
              keyboardType="numbers-and-punctuation"
              placeholder="HH:MM"
              placeholderTextColor={color.neutral[600]}
              selectionColor={color.accent}
              maxLength={5}
              accessibilityLabel="Escribir una hora"
              style={[
                styles.input,
                { borderColor: invalid ? color.neutral[600] : color.accent },
              ]}
            />
          </View>

          {invalid ? (
            <Text style={styles.hint}>Entre 00:00 y 23:59.</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: color.divider,
    marginTop: 12,
    paddingTop: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: layout.minTouch,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  valueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: color.accent,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    minHeight: layout.minTouch,
  },
  panel: {
    gap: 10,
    paddingTop: 10,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  manual: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  input: {
    ...typography.row,
    color: color.text,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    minHeight: layout.minTouch,
    minWidth: 92,
    textAlign: 'center',
  },
  hint: {
    ...typography.meta,
    fontSize: 12,
    color: color.neutral[600],
  },
});
