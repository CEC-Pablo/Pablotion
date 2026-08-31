/**
 * PromptEditor — el prompt entero, que es el único sitio donde se ve entero.
 *
 * En la lista de Ramos un prompt son dos líneas; aquí se lee y se edita
 * completo. Sin tope de caracteres: la gracia de un prompt de estudio es que
 * sea largo y específico, y recortarlo lo estropearía.
 *
 * Autoguardado con debounce, como el editor de notas. En esta app no hay
 * botón «Guardar» en ninguna parte.
 */

import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../src/components/Button';
import { Icon } from '../../src/components/Icon';
import { FadingRule, TagDot, Touchable } from '../../src/components/primitives';
import { Toast } from '../../src/components/Toast';
import { charCount, toast as toastText } from '../../src/i18n';
import { useStore } from '../../src/store/useStore';
import { color, layout, radius, type as typography } from '../../src/theme/tokens';

const AUTOSAVE_MS = 500;

export default function PromptEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const prompt = useStore((s) => s.prompts.find((p) => p.id === id));
  const course = useStore((s) => s.courses.find((c) => c.id === prompt?.course_id));
  const savePrompt = useStore((s) => s.savePrompt);
  const removePrompt = useStore((s) => s.removePrompt);
  const toast = useStore((s) => s.toast);
  const showToast = useStore((s) => s.showToast);
  const hideToast = useStore((s) => s.hideToast);

  const [label, setLabel] = useState(prompt?.label ?? '');
  const [body, setBody] = useState(prompt?.body ?? '');
  const [confirming, setConfirming] = useState(false);
  const dirty = useRef(false);

  /**
   * Un prompt se crea vacío y se abre aquí para pegar dentro. Si se sale sin
   * escribir nada, no tiene sentido dejar una tarjeta fantasma en la lista, así
   * que se descarta. Solo se aplica a los que ya llegaron vacíos: vaciar a mano
   * uno que tenía texto no lo borra a traición.
   */
  const bornEmpty = useRef((prompt?.label ?? '') === '' && (prompt?.body ?? '') === '');
  const latest = useRef({ label, body });
  latest.current = { label, body };

  useEffect(() => {
    if (!dirty.current || !id) return;
    const timer = setTimeout(() => {
      void savePrompt(id, { label, body });
      dirty.current = false;
    }, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [label, body, id, savePrompt]);

  useEffect(() => {
    return () => {
      if (!id) return;
      const { label: finalLabel, body: finalBody } = latest.current;

      if (bornEmpty.current && finalLabel.trim() === '' && finalBody.trim() === '') {
        void removePrompt(id);
        return;
      }

      // El debounce del autoguardado se cancela al desmontar. Si se sale
      // dentro del medio segundo posterior a la última tecla, sin esto se
      // perderían justo los últimos caracteres escritos.
      if (dirty.current) void savePrompt(id, { label: finalLabel, body: finalBody });
    };
  }, [id, removePrompt, savePrompt]);

  if (!prompt || !id) {
    return <SafeAreaView style={styles.screen} />;
  }

  const copy = async () => {
    try {
      const ok = await Clipboard.setStringAsync(body);
      showToast(ok ? toastText.promptCopied : toastText.promptCopyFailed);
    } catch {
      showToast(toastText.promptCopyFailed);
    }
  };

  const handleDelete = async () => {
    // Al borrar aquí no hay vuelta atrás y el texto puede ser largo: se pide
    // un segundo toque, igual que al eliminar un ramo.
    if (!confirming) {
      setConfirming(true);
      return;
    }
    bornEmpty.current = false;
    await removePrompt(id);
    showToast(toastText.promptDeleted);
    router.back();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.bar}>
        <Touchable onPress={() => router.back()} accessibilityLabel="Volver">
          <Icon name="arrow-left" size={20} color={color.neutral[400]} />
        </Touchable>

        {course ? (
          <View style={styles.context}>
            <TagDot color={course.color} size={8} />
            <Text style={styles.contextText} numberOfLines={1}>
              {course.name}
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        <Touchable
          onPress={() => void handleDelete()}
          accessibilityLabel={confirming ? 'Confirmar eliminación' : 'Eliminar prompt'}
        >
          <Icon
            name="trash"
            size={19}
            color={confirming ? color.accentRamp[400] : color.neutral[500]}
          />
        </Touchable>
      </View>

      {confirming ? (
        <Pressable onPress={() => setConfirming(false)} style={styles.confirmBanner}>
          <Text style={styles.confirmText}>
            Toca otra vez la papelera para eliminarlo. Toca aquí para dejarlo estar.
          </Text>
        </Pressable>
      ) : null}

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <TextInput
          value={label}
          onChangeText={(next) => {
            dirty.current = true;
            setLabel(next);
          }}
          placeholder="Nombre (opcional)"
          placeholderTextColor={color.neutral[700]}
          selectionColor={color.accent}
          style={styles.labelInput}
          accessibilityLabel="Nombre del prompt"
        />

        <FadingRule fade={24} style={{ marginBottom: 12 }} />

        <TextInput
          value={body}
          onChangeText={(next) => {
            dirty.current = true;
            setBody(next);
          }}
          multiline
          // Sin `maxLength`: un prompt de estudio puede ocupar varias pantallas
          // y truncarlo en silencio sería la peor forma de fallar.
          autoFocus={body.length === 0}
          placeholder="Pega aquí el prompt de este ramo…"
          placeholderTextColor={color.neutral[600]}
          selectionColor={color.accent}
          style={styles.bodyInput}
          accessibilityLabel="Texto del prompt"
        />
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.count}>{charCount(body.length)}</Text>
        <Button
          label="Copiar"
          icon="copy"
          onPress={() => void copy()}
          disabled={body.length === 0}
          height={42}
          style={{ flex: 1 }}
        />
      </View>

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
    gap: 12,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 6,
  },
  context: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  contextText: {
    ...typography.secondary,
    color: color.neutral[400],
    flexShrink: 1,
  },
  confirmBanner: {
    marginHorizontal: layout.screenPadding,
    marginBottom: 4,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.accentRamp[800],
    backgroundColor: color.accentRamp[900],
  },
  confirmText: {
    ...typography.meta,
    fontSize: 12,
    color: color.accentRamp[300],
  },
  body: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 24,
  },
  labelInput: {
    ...typography.preview,
    color: color.text,
    minHeight: 40,
    padding: 0,
    marginBottom: 10,
  },
  bodyInput: {
    ...typography.row,
    lineHeight: 24.75,
    color: color.neutral[300],
    minHeight: 260,
    padding: 0,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: layout.screenPadding,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: color.divider,
  },
  count: {
    ...typography.meta,
    color: color.neutral[600],
  },
});
