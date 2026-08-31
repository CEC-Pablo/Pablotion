/**
 * NoteEditor — leer y editar una nota, cambiar su tipo, ponerle recordatorio
 * o borrarla.
 *
 * Autoguardado con debounce: no hay botón «Guardar» en ninguna parte de la app.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../src/components/Button';
import { Icon, TYPE_ICON } from '../../src/components/Icon';
import {
  FadingRule,
  PriorityDot,
  TagDot,
  Touchable,
} from '../../src/components/primitives';
import { Toast } from '../../src/components/Toast';
import {
  PRIORITY_CYCLE,
  PRIORITY_LABEL,
  seriesRemoved,
  toast as toastText,
} from '../../src/i18n';
import { formatCreated, formatShortDue } from '../../src/lib/dates';
import { useStore } from '../../src/store/useStore';
import {
  color,
  layout,
  radius,
  type as typography,
} from '../../src/theme/tokens';
import type { Entry, EntryType } from '../../src/types';

const AUTOSAVE_MS = 500;

/** El `series_id` de una entrada, o null si no forma parte de ninguna serie. */
function entrySeriesId(entries: Entry[], id: string | undefined): string | null {
  return entries.find((e) => e.id === id)?.series_id ?? null;
}
const TYPES: EntryType[] = ['note', 'task', 'reminder'];

export default function NoteEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const entry = useStore((s) => s.entries.find((e) => e.id === id));
  const tags = useStore((s) => s.tags);
  const patchEntry = useStore((s) => s.patchEntry);
  const removeEntry = useStore((s) => s.removeEntry);
  const removeSeries = useStore((s) => s.removeSeries);
  // Cuántas copias tiene la serie a la que pertenece, ella incluida. Si no
  // es parte de ninguna, sale 0 y el bloque de repeticiones ni aparece.
  const siblings = useStore((s) =>
    entrySeriesId(s.entries, id) === null
      ? 0
      : s.entries.filter((e) => e.series_id === entrySeriesId(s.entries, id)).length
  );
  const toast = useStore((s) => s.toast);
  const showToast = useStore((s) => s.showToast);
  const hideToast = useStore((s) => s.hideToast);

  const [title, setTitle] = useState(entry?.title ?? '');
  const [body, setBody] = useState(entry?.body ?? '');
  const [pickingTag, setPickingTag] = useState(false);
  const [pickingPriority, setPickingPriority] = useState(false);
  const [confirmingSeries, setConfirmingSeries] = useState(false);
  const dirty = useRef(false);

  const tag = useMemo(
    () => tags.find((t) => t.id === entry?.tag_id),
    [tags, entry?.tag_id]
  );

  useEffect(() => {
    if (!dirty.current || !id) return;
    const timer = setTimeout(() => {
      void patchEntry(id, { title, body });
      dirty.current = false;
    }, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [title, body, id, patchEntry]);

  if (!entry || !id) {
    return <SafeAreaView style={styles.screen} />;
  }

  const due = entry.due_at ? new Date(entry.due_at) : null;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.bar}>
        <Touchable onPress={() => router.back()} accessibilityLabel="Volver">
          <Icon name="arrow-left" size={20} color={color.neutral[400]} />
        </Touchable>

        <View style={styles.typeSwitcher}>
          {TYPES.map((type) => {
            const active = entry.type === type;
            return (
              <Pressable
                key={type}
                onPress={() => void patchEntry(id, { type })}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.typeButton, active && { borderColor: color.accent }]}
              >
                <Icon
                  name={TYPE_ICON[type]}
                  size={17}
                  color={active ? color.accent : color.neutral[600]}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <TextInput
          value={title}
          onChangeText={(next) => {
            dirty.current = true;
            setTitle(next);
          }}
          multiline
          selectionColor={color.accent}
          style={styles.titleInput}
          accessibilityLabel="Título"
        />

        <TextInput
          value={body}
          onChangeText={(next) => {
            dirty.current = true;
            setBody(next);
          }}
          multiline
          placeholder="Añade lo que quieras recordar…"
          placeholderTextColor={color.neutral[600]}
          selectionColor={color.accent}
          style={styles.bodyInput}
          accessibilityLabel="Cuerpo de la nota"
        />

        <FadingRule fade={24} style={{ marginVertical: 14 }} />

        <Pressable
          onPress={() => setPickingTag(!pickingTag)}
          accessibilityRole="button"
          accessibilityState={{ expanded: pickingTag }}
          style={styles.metaRow}
        >
          <Icon name="tag" size={17} color={color.neutral[500]} />
          <Text style={styles.metaLabel}>Etiqueta</Text>
          {tag ? (
            <View style={styles.tagChip}>
              <TagDot color={tag.color} />
              <Text style={styles.metaValue}>{tag.name}</Text>
            </View>
          ) : (
            <Text style={[styles.metaValue, { color: color.neutral[600] }]}>Ninguna</Text>
          )}
          <Icon name="caret-down" size={14} color={color.neutral[600]} />
        </Pressable>

        {pickingTag ? (
          <View style={styles.tagPicker}>
            {tags.map((option) => {
              const active = option.id === entry.tag_id;
              return (
                <Pressable
                  key={option.id}
                  // Volver a tocar la etiqueta activa la quita: es la forma más
                  // corta de dejar una nota sin etiqueta.
                  onPress={() => {
                    void patchEntry(id, { tag_id: active ? null : option.id });
                    setPickingTag(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={option.name}
                  style={({ pressed }) => [
                    styles.tagOption,
                    active && { borderColor: color.accent },
                    { opacity: pressed ? 0.72 : 1 },
                  ]}
                >
                  <TagDot color={option.color} size={8} />
                  <Text
                    style={[
                      styles.metaValue,
                      { color: active ? color.accent : color.neutral[400] },
                    ]}
                  >
                    {option.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* La prioridad ordena la lista de Inicio: lo urgente sube. */}
        <Pressable
          onPress={() => setPickingPriority(!pickingPriority)}
          accessibilityRole="button"
          accessibilityState={{ expanded: pickingPriority }}
          style={styles.metaRow}
        >
          <Icon name="arrow-up" size={17} color={color.neutral[500]} />
          <Text style={styles.metaLabel}>Prioridad</Text>
          {entry.priority ? (
            <View style={styles.tagChip}>
              <PriorityDot priority={entry.priority} />
              <Text style={styles.metaValue}>{PRIORITY_LABEL[entry.priority]}</Text>
            </View>
          ) : (
            <Text style={[styles.metaValue, { color: color.neutral[600] }]}>Sin prioridad</Text>
          )}
          <Icon name="caret-down" size={14} color={color.neutral[600]} />
        </Pressable>

        {pickingPriority ? (
          <View style={styles.tagPicker}>
            {PRIORITY_CYCLE.map((option) => {
              const active = option === entry.priority;
              return (
                <Pressable
                  key={option}
                  // Volver a tocar la activa la quita, igual que en etiquetas.
                  onPress={() => {
                    void patchEntry(id, { priority: active ? null : option });
                    setPickingPriority(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={PRIORITY_LABEL[option]}
                  style={({ pressed }) => [
                    styles.tagOption,
                    active && { borderColor: color.accent },
                    { opacity: pressed ? 0.72 : 1 },
                  ]}
                >
                  <PriorityDot priority={option} />
                  <Text
                    style={[
                      styles.metaValue,
                      { color: active ? color.accent : color.neutral[400] },
                    ]}
                  >
                    {PRIORITY_LABEL[option]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <Pressable
          onPress={() => router.push(`/reminder/${id}`)}
          accessibilityRole="button"
          style={styles.metaRow}
        >
          <Icon name="bell" size={17} color={color.neutral[500]} />
          <Text style={styles.metaLabel}>Recordatorio</Text>
          <Text
            style={[
              styles.metaValue,
              { color: due ? color.accent : color.neutral[600] },
            ]}
          >
            {due ? formatShortDue(due) : 'Sin fecha'}
          </Text>
          <Icon name="caret-right" size={14} color={color.neutral[600]} />
        </Pressable>

        <View style={styles.metaRow}>
          <Icon name="clock-counter-clockwise" size={17} color={color.neutral[500]} />
          <Text style={styles.metaLabel}>Creada</Text>
          <Text style={styles.metaValue}>
            {formatCreated(new Date(entry.created_at))}
          </Text>
        </View>

        {/* Si esto es una copia de una serie repetida, borrarlas a mano una
            por una sería peor que haberlas creado a mano — que es justo de lo
            que la serie venía a librarte. */}
        {siblings > 1 ? (
          <View style={styles.seriesBox}>
            <View style={styles.seriesHead}>
              <Icon name="clock-counter-clockwise" size={15} color={color.accent} />
              <Text style={styles.seriesText}>
                Una de {siblings} copias repetidas.
              </Text>
            </View>
            <Text style={styles.seriesHint}>
              Eliminar aquí borra solo esta. Las demás siguen en su día.
            </Text>
          </View>
        ) : null}

        <View style={styles.deleteRow}>
          <Button
            label="Eliminar"
            variant="ghost"
            icon="trash"
            onPress={async () => {
              await removeEntry(id);
              showToast(toastText.deleted);
              router.replace('/');
            }}
          />

          {siblings > 1 ? (
            <Button
              label={
                confirmingSeries ? `Sí, borrar las ${siblings}` : 'Eliminar las repeticiones'
              }
              variant={confirmingSeries ? 'primary' : 'ghost'}
              icon="trash"
              onPress={async () => {
                // Dos toques: se lleva por delante hasta ciento veinte cosas y
                // no hay deshacer en ninguna parte de la app.
                if (!confirmingSeries) {
                  setConfirmingSeries(true);
                  return;
                }
                const gone = await removeSeries(entry.series_id!);
                showToast(seriesRemoved(gone));
                router.replace('/');
              }}
            />
          ) : null}
        </View>
      </ScrollView>

      <Toast message={toast} onDismiss={hideToast} withTabBar={false} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 6,
  },
  typeSwitcher: {
    flexDirection: 'row',
    gap: 6,
  },
  typeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: color.divider,
    borderRadius: radius.md,
  },
  body: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 32,
  },
  titleInput: {
    ...typography.noteTitle,
    color: color.text,
    minHeight: 64,
    padding: 0,
    textAlignVertical: 'top',
  },
  bodyInput: {
    ...typography.row,
    lineHeight: 24.75,
    color: color.neutral[300],
    minHeight: 120,
    padding: 0,
    textAlignVertical: 'top',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    minHeight: layout.minTouch,
  },
  seriesBox: {
    marginTop: layout.sectionMarginTop,
    padding: 12,
    gap: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.accentRamp[800],
    backgroundColor: color.accentRamp[900],
  },
  seriesHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  seriesText: {
    ...typography.secondary,
    color: color.accentRamp[200],
    flexShrink: 1,
  },
  seriesHint: {
    ...typography.meta,
    fontSize: 12,
    color: color.accentRamp[400],
  },
  deleteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: layout.sectionMarginTop,
  },
  metaLabel: {
    ...typography.secondary,
    color: color.neutral[400],
    flex: 1,
  },
  metaValue: {
    ...typography.secondary,
    color: color.text,
  },
  tagPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 12,
  },
  tagOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: color.divider,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    minHeight: layout.minTouch,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: color.neutral[900],
    borderRadius: radius.md,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
});
