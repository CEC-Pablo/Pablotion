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
import { FadingRule, TagDot, Touchable } from '../../src/components/primitives';
import { Toast } from '../../src/components/Toast';
import { toast as toastText } from '../../src/i18n';
import { formatCreated, formatShortDue } from '../../src/lib/dates';
import { useStore } from '../../src/store/useStore';
import {
  color,
  layout,
  radius,
  type as typography,
} from '../../src/theme/tokens';
import type { EntryType } from '../../src/types';

const AUTOSAVE_MS = 500;
const TYPES: EntryType[] = ['note', 'task', 'reminder'];

export default function NoteEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const entry = useStore((s) => s.entries.find((e) => e.id === id));
  const tags = useStore((s) => s.tags);
  const patchEntry = useStore((s) => s.patchEntry);
  const removeEntry = useStore((s) => s.removeEntry);
  const toast = useStore((s) => s.toast);
  const showToast = useStore((s) => s.showToast);
  const hideToast = useStore((s) => s.hideToast);

  const [title, setTitle] = useState(entry?.title ?? '');
  const [body, setBody] = useState(entry?.body ?? '');
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

        <View style={styles.metaRow}>
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
        </View>

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

        <View style={{ marginTop: layout.sectionMarginTop, alignItems: 'flex-start' }}>
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
  metaLabel: {
    ...typography.secondary,
    color: color.neutral[400],
    flex: 1,
  },
  metaValue: {
    ...typography.secondary,
    color: color.text,
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
