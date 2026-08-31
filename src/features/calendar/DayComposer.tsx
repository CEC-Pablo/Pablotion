/**
 * Contenido de la hoja para añadir algo en un día del calendario.
 *
 * Antes esto era una tarjeta que se desplegaba **dentro** de la lista, justo
 * debajo de la rejilla del mes. Sobre el papel era elegante; en el teléfono no:
 * al abrirse crecía de golpe, el teclado empujaba la vista y el calendario
 * salía disparado fuera de pantalla. Uno tocaba «Añadir en este día» y perdía
 * de vista el día que acababa de tocar.
 *
 * Ahora es una hoja de verdad, con su fondo oscurecido: el calendario sigue
 * ahí detrás, quieto, y lo que lo tapa lo tapa a propósito.
 *
 * La otra mitad del arreglo es la altura. Con todo desplegado a la vez —tipo,
 * hora y ocho etiquetas— la hoja ocupaba media pantalla para escribir una
 * línea. Hora y etiqueta empiezan plegadas y solo se abren si hacen falta;
 * lo normal es escribir y darle a Añadir.
 */

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '../../components/Button';
import { Icon, TYPE_ICON } from '../../components/Icon';
import { TagDot, Touchable } from '../../components/primitives';
import { TYPE_CYCLE, TYPE_LABEL } from '../../i18n';
import { formatHHMM } from '../../lib/dates';
import { detectType } from '../capture/detectType';
import { TimeRow } from '../reminders/TimeRow';
import { color, layout, radius, type as typography } from '../../theme/tokens';
import type { EntryType, Tag } from '../../types';

export function DayComposer({
  day,
  dayLabel,
  tags,
  detectionEnabled,
  bottomInset = 0,
  onSubmit,
  onCancel,
}: {
  day: Date;
  /** Ya formateado por la ruta: "martes 2 de septiembre". */
  dayLabel: string;
  tags: Tag[];
  detectionEnabled: boolean;
  /** Hueco de la barra de navegación del teléfono, si la hay. */
  bottomInset?: number;
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
  const [pickingTag, setPickingTag] = useState(false);

  const hasText = title.trim().length > 0;
  const detected = detectionEnabled ? detectType(title) : 'note';
  const type = override ?? detected;
  const tag = tags.find((t) => t.id === tagId) ?? null;

  const handleSubmit = () => {
    const text = title.trim();
    if (!text) return;

    const dueAt = new Date(day);
    dueAt.setHours(hour, minute, 0, 0);
    onSubmit({ type, title: text, dueAt, tagId });
  };

  return (
    <View style={[styles.sheet, { paddingBottom: 10 + bottomInset }]}>
      {/* El asa no hace nada: es la señal de que esto es una capa que se
          cierra, no una parte de la pantalla que había debajo. */}
      <View style={styles.handle} />

      <View style={styles.head}>
        <Icon name="calendar-blank" size={15} color={color.accent} />
        <Text style={styles.headText} numberOfLines={1}>
          {dayLabel}
        </Text>
        <View style={{ flex: 1 }} />
        <Touchable size={30} onPress={onCancel} accessibilityLabel="Cerrar">
          <Icon name="x" size={17} color={color.neutral[500]} />
        </Touchable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
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
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={TYPE_LABEL[option]}
                style={({ pressed }) => [
                  styles.typeOption,
                  active && {
                    borderColor: color.accent,
                    backgroundColor: color.accentRamp[900],
                  },
                  { opacity: pressed ? 0.72 : 1 },
                ]}
              >
                <Icon
                  name={TYPE_ICON[option]}
                  size={14}
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
          <View style={styles.pickerWrap}>
            <Pressable
              onPress={() => setPickingTag(!pickingTag)}
              accessibilityRole="button"
              accessibilityState={{ expanded: pickingTag }}
              accessibilityLabel={`Etiqueta: ${tag ? tag.name : 'ninguna'}`}
              style={styles.pickerRow}
            >
              <View style={styles.pickerLabel}>
                <Icon name="tag" size={16} color={color.neutral[400]} />
                <Text style={[typography.body, { color: color.neutral[400] }]}>
                  Etiqueta
                </Text>
              </View>

              <View style={styles.pickerValue}>
                {tag ? <TagDot color={tag.color} size={7} /> : null}
                <Text
                  style={[
                    typography.secondary,
                    { color: tag ? color.accent : color.neutral[500] },
                  ]}
                  numberOfLines={1}
                >
                  {tag ? tag.name : 'Ninguna'}
                </Text>
                <Icon
                  name="caret-down"
                  size={13}
                  color={tag ? color.accent : color.neutral[500]}
                />
              </View>
            </Pressable>

            {pickingTag ? (
              <View style={styles.tagRow}>
                {tags.map((option) => {
                  const active = option.id === tagId;
                  return (
                    <Pressable
                      key={option.id}
                      // Volver a tocarla la quita, como en el editor de nota.
                      onPress={() => setTagId(active ? null : option.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={option.name}
                      style={({ pressed }) => [
                        styles.tagOption,
                        active && { borderColor: color.accent },
                        { opacity: pressed ? 0.72 : 1 },
                      ]}
                    >
                      <TagDot color={option.color} size={7} />
                      <Text
                        style={[styles.tagName, active && { color: color.accent }]}
                        numberOfLines={1}
                      >
                        {option.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.microcopy}>
          {type === 'note'
            ? 'Queda con fecha, sin avisar.'
            : `Te avisará a las ${formatHHMM(hour, minute)}.`}
        </Text>
        <Button
          label="Añadir"
          icon="plus"
          onPress={handleSubmit}
          disabled={!hasText}
          height={46}
        />
      </View>
    </View>
  );
}

/** La hoja llega hasta aquí como mucho; el resto se desplaza por dentro. */
export const SHEET_MAX_HEIGHT_RATIO = 0.86;

const styles = StyleSheet.create({
  sheet: {
    // Sin `flexShrink` la hoja ignoraría el alto máximo que le pone la ruta:
    // en React Native los hijos no encogen por defecto, así que con muchas
    // etiquetas desplegadas crecería hasta salirse por arriba de la pantalla.
    flexShrink: 1,
    backgroundColor: color.surface,
    // Radio mayor que `radius.lg` a propósito: es la única superficie de la app
    // que se apoya en el borde de la pantalla y necesita leerse como una capa.
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: color.neutral[800],
    paddingHorizontal: 16,
    paddingTop: 8,
    // `paddingBottom` lo pone quien monta la hoja: depende de la barra de
    // navegación del teléfono, que no se conoce desde aquí.
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.neutral[800],
    marginBottom: 10,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 2,
  },
  headText: {
    ...typography.kicker,
    color: color.accent,
    flexShrink: 1,
  },
  scroll: {
    flexShrink: 1,
  },
  content: {
    paddingBottom: 4,
  },
  input: {
    ...typography.captureInput,
    color: color.text,
    minHeight: 40,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: color.divider,
    borderRadius: radius.md,
    paddingHorizontal: 6,
    minHeight: 38,
  },
  typeLabel: {
    ...typography.meta,
    fontSize: 12,
    color: color.neutral[600],
    flexShrink: 1,
  },
  pickerWrap: {
    borderTopWidth: 1,
    borderTopColor: color.divider,
    marginTop: 12,
    paddingTop: 10,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: layout.minTouch,
  },
  pickerLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: color.divider,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    minHeight: layout.minTouch,
    maxWidth: '60%',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 10,
  },
  tagOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: color.divider,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    minHeight: 36,
  },
  tagName: {
    ...typography.meta,
    fontSize: 12,
    color: color.neutral[500],
  },
  footer: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: color.divider,
    paddingTop: 10,
    marginTop: 4,
  },
  microcopy: {
    ...typography.meta,
    color: color.neutral[600],
  },
});
