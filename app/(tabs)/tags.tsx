/**
 * Etiquetas — administrar hasta seis.
 *
 * Seis es el tamaño de la paleta, no un máximo por nota: cada ítem lleva UNA
 * etiqueta (§3.2). Al borrar una, las notas conservan su texto y se quedan sin
 * etiqueta (la FK cae a NULL).
 */

import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../src/components/Button';
import { Icon } from '../../src/components/Icon';
import { Kicker, TagDot, Touchable } from '../../src/components/primitives';
import { Toast } from '../../src/components/Toast';
import { noteCount, toast as toastText } from '../../src/i18n';
import { MAX_TAGS } from '../../src/lib/db/queries';
import { useStore } from '../../src/store/useStore';
import {
  TAG_PALETTE,
  color,
  layout,
  motion,
  radius,
  type as typography,
} from '../../src/theme/tokens';
import type { Tag } from '../../src/types';

export default function TagManager() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  const tags = useStore((s) => s.tags);
  const counts = useStore((s) => s.counts);
  const updateTag = useStore((s) => s.updateTag);
  const removeTag = useStore((s) => s.removeTag);
  const addTag = useStore((s) => s.addTag);
  const toast = useStore((s) => s.toast);
  const showToast = useStore((s) => s.showToast);
  const hideToast = useStore((s) => s.hideToast);

  const full = tags.length >= MAX_TAGS;

  /**
   * Crear una etiqueta no abre ningún diálogo: nace con el primer color libre
   * de la paleta y entra directamente en modo renombrar, con el teclado ya
   * puesto. Mismo criterio que el resto de la app — no hay botón «Guardar».
   */
  const handleCreate = async () => {
    if (full) {
      showToast(toastText.tagLimit);
      return;
    }

    const used = new Set(tags.map((t) => t.color));
    const color = TAG_PALETTE.find((c) => !used.has(c)) ?? TAG_PALETTE[0];

    const created = await addTag('Nueva etiqueta', color);
    if (!created) {
      showToast(toastText.tagLimit);
      return;
    }

    setOpenId(created.id);
    setDraftName('');
    setRenamingId(created.id);
  };

  const commitRename = async (tag: Tag) => {
    const name = draftName.trim();
    if (name && name !== tag.name) await updateTag(tag.id, { name });
    setRenamingId(null);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Etiquetas</Text>
        <Text style={styles.subtitle}>
          Hasta ocho. Menos etiquetas, menos decisiones cada vez que anotas algo.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {tags.map((tag) => {
          const open = openId === tag.id;
          return (
            <View key={tag.id} style={[styles.row, open && styles.rowOpen]}>
              <Pressable
                onPress={() => setOpenId(open ? null : tag.id)}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                style={styles.rowHead}
              >
                <TagDot color={tag.color} size={10} />

                {renamingId === tag.id ? (
                  <TextInput
                    value={draftName}
                    onChangeText={setDraftName}
                    onBlur={() => void commitRename(tag)}
                    onSubmitEditing={() => void commitRename(tag)}
                    autoFocus
                    selectionColor={color.accent}
                    style={[styles.name, styles.nameInput]}
                  />
                ) : (
                  <Text style={styles.name}>{tag.name}</Text>
                )}

                <Text style={styles.count}>{noteCount(counts[tag.id] ?? 0)}</Text>
                <Caret open={open} />
              </Pressable>

              {open ? (
                <View style={styles.expanded}>
                  <Kicker style={{ marginBottom: 8 }}>Color</Kicker>
                  <View style={styles.swatches}>
                    {TAG_PALETTE.map((swatch) => (
                      <Touchable
                        key={swatch}
                        size={34}
                        onPress={() => void updateTag(tag.id, { color: swatch })}
                        accessibilityLabel={`Color ${swatch}`}
                        style={[
                          styles.swatch,
                          { backgroundColor: swatch },
                          tag.color === swatch && styles.swatchActive,
                        ]}
                      >
                        <View />
                      </Touchable>
                    ))}
                  </View>

                  <View style={styles.actions}>
                    <Button
                      label="Renombrar"
                      variant="secondary"
                      icon="pencil-simple"
                      onPress={() => {
                        setDraftName(tag.name);
                        setRenamingId(tag.id);
                        showToast(toastText.renaming(tag.name));
                      }}
                    />
                    <Button
                      label="Eliminar"
                      variant="ghost"
                      icon="trash"
                      onPress={() => {
                        void removeTag(tag.id);
                        setOpenId(null);
                        showToast(toastText.tagsKeepText);
                      }}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}

        <Pressable
          onPress={() => void handleCreate()}
          accessibilityRole="button"
          accessibilityLabel={full ? 'Límite de etiquetas alcanzado' : 'Nueva etiqueta'}
          style={styles.newTag}
        >
          <Icon name="plus" size={16} color={color.neutral[700]} />
          <Text
            style={[
              typography.row,
              { color: full ? color.neutral[700] : color.neutral[500] },
            ]}
          >
            {full ? `Ya tienes ${MAX_TAGS}. Elimina una para crear otra.` : 'Nueva etiqueta'}
          </Text>
        </Pressable>
      </ScrollView>

      <Toast message={toast} onDismiss={hideToast} />
    </SafeAreaView>
  );
}

function Caret({ open }: { open: boolean }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withTiming(open ? 180 : 0, {
      duration: motion.tagRow,
      easing: Easing.bezier(...motion.ease),
    });
  }, [open, rotation]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={style}>
      <Icon name="caret-down" size={14} color={color.neutral[600]} />
    </Animated.View>
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
    gap: 6,
  },
  title: {
    ...typography.screenTitle,
    color: color.text,
  },
  subtitle: {
    ...typography.secondary,
    color: color.neutral[600],
    maxWidth: 280,
  },
  list: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: layout.sectionMarginTop,
    paddingBottom: 24,
    gap: layout.rowGap,
  },
  row: {
    borderRadius: radius.md,
  },
  rowOpen: {
    backgroundColor: color.surface,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: layout.rowPadding,
    minHeight: layout.minTouch,
  },
  name: {
    ...typography.row,
    color: color.text,
    flex: 1,
  },
  nameInput: {
    padding: 0,
  },
  count: {
    ...typography.meta,
    fontSize: 12,
    color: color.neutral[600],
  },
  expanded: {
    paddingHorizontal: layout.rowPadding,
    paddingBottom: layout.rowPadding,
  },
  swatches: {
    flexDirection: 'row',
    // La paleta pasó de seis colores a dieciséis y esta fila se quedó sin
    // `flexWrap`: los últimos se salían del ancho de la pantalla y no había
    // forma de tocarlos.
    flexWrap: 'wrap',
    gap: 8,
  },
  swatch: {
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: color.surface,
  },
  swatchActive: {
    borderColor: color.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  newTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.neutral[800],
    borderRadius: radius.md,
    padding: layout.rowPadding,
    minHeight: layout.minTouch,
  },
});
