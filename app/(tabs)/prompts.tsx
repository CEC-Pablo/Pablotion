/**
 * Ramos — los prompts de estudio, agrupados por asignatura.
 *
 * La pantalla existe por un motivo concreto: cada ramo tiene un prompt largo
 * y afinado que se acaba perdiendo en el historial del chat. Aquí vive, se
 * copia de un toque y se pega donde toque.
 *
 * Regla de la lista: **el prompt nunca se ve entero**. Dos líneas y a otra
 * cosa. Un prompt de tres mil caracteres desplegado convertiría la pantalla
 * en un muro por el que hay que hacer scroll para llegar al siguiente ramo,
 * que es justo lo contrario de lo que sirve para estudiar. El texto completo
 * solo aparece en su propia pantalla, donde sí se puede leer y editar.
 */

import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../src/components/Icon';
import { Toast } from '../../src/components/Toast';
import { TagDot, Touchable } from '../../src/components/primitives';
import {
  charCount,
  promptCount,
  promptTitle,
  toast as toastText,
} from '../../src/i18n';
import { useStore } from '../../src/store/useStore';
import {
  TAG_PALETTE,
  color,
  layout,
  motion,
  radius,
  type as typography,
} from '../../src/theme/tokens';
import type { Course, Prompt } from '../../src/types';

export default function CoursePrompts() {
  const router = useRouter();

  const courses = useStore((s) => s.courses);
  const prompts = useStore((s) => s.prompts);
  const addCourse = useStore((s) => s.addCourse);
  const renameCourse = useStore((s) => s.renameCourse);
  const removeCourse = useStore((s) => s.removeCourse);
  const addPrompt = useStore((s) => s.addPrompt);
  const toast = useStore((s) => s.toast);
  const showToast = useStore((s) => s.showToast);
  const hideToast = useStore((s) => s.hideToast);

  const [openId, setOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  /** Borrar un ramo se lleva sus prompts: hace falta un segundo toque. */
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  /** Los prompts de cada ramo, ya agrupados y en orden. */
  const byCourse = useMemo(() => {
    const map = new Map<string, Prompt[]>();
    for (const prompt of prompts) {
      const list = map.get(prompt.course_id) ?? [];
      list.push(prompt);
      map.set(prompt.course_id, list);
    }
    return map;
  }, [prompts]);

  /**
   * Un ramo nace con nombre provisional y entra directo en renombrar, con el
   * teclado ya puesto. Mismo gesto que crear una etiqueta: en esta app no hay
   * diálogos previos ni botón «Guardar».
   */
  const handleNewCourse = async () => {
    const used = new Set(courses.map((c) => c.color));
    const free = TAG_PALETTE.find((c) => !used.has(c)) ?? TAG_PALETTE[0];

    const created = await addCourse('Nuevo ramo', free);
    setOpenId(created.id);
    setDraftName('');
    setRenamingId(created.id);
  };

  const commitRename = async (course: Course) => {
    const name = draftName.trim();
    if (name && name !== course.name) await renameCourse(course.id, { name });
    setRenamingId(null);
  };

  /** Tocar el punto cambia el color al siguiente libre de la paleta. */
  const cycleColor = async (course: Course) => {
    const index = TAG_PALETTE.indexOf(course.color as (typeof TAG_PALETTE)[number]);
    const next = TAG_PALETTE[(index + 1) % TAG_PALETTE.length];
    await renameCourse(course.id, { color: next });
  };

  const handleNewPrompt = async (courseId: string) => {
    const created = await addPrompt(courseId);
    router.push({ pathname: '/prompt/[id]', params: { id: created.id } });
  };

  const handleDelete = async (course: Course) => {
    const count = byCourse.get(course.id)?.length ?? 0;
    await removeCourse(course.id);
    setConfirmingId(null);
    setOpenId(null);
    showToast(toastText.courseDeleted(count));
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Ramos</Text>
        <Text style={styles.subtitle}>
          Un prompt afinado no se vuelve a escribir: se guarda una vez y se copia.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {courses.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="graduation-cap" size={26} color={color.neutral[700]} />
            <Text style={styles.emptyText}>
              Todavía no hay ramos. Crea uno con el nombre de la asignatura y pega
              dentro el prompt que usas para estudiarla.
            </Text>
          </View>
        ) : null}

        {courses.map((course) => {
          const open = openId === course.id;
          const list = byCourse.get(course.id) ?? [];
          const confirming = confirmingId === course.id;

          return (
            <View key={course.id} style={[styles.course, open && styles.courseOpen]}>
              <View style={styles.courseHead}>
                <Touchable
                  size={24}
                  onPress={() => void cycleColor(course)}
                  accessibilityLabel={`Cambiar el color de ${course.name}`}
                >
                  <TagDot color={course.color} size={10} />
                </Touchable>

                <Pressable
                  onPress={() => {
                    setOpenId(open ? null : course.id);
                    setConfirmingId(null);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  accessibilityLabel={course.name}
                  style={styles.courseTitleArea}
                >
                  {renamingId === course.id ? (
                    <TextInput
                      value={draftName}
                      onChangeText={setDraftName}
                      onBlur={() => void commitRename(course)}
                      onSubmitEditing={() => void commitRename(course)}
                      autoFocus
                      placeholder="Nombre del ramo"
                      placeholderTextColor={color.neutral[600]}
                      selectionColor={color.accent}
                      style={[styles.courseName, styles.courseNameInput]}
                      accessibilityLabel="Nombre del ramo"
                    />
                  ) : (
                    <Text style={styles.courseName} numberOfLines={1}>
                      {course.name}
                    </Text>
                  )}

                  <Text style={styles.courseCount}>{promptCount(list.length)}</Text>
                  <Caret open={open} />
                </Pressable>
              </View>

              {open ? (
                <Animated.View entering={FadeIn.duration(140)} style={styles.expanded}>
                  {list.map((prompt) => (
                    <PromptCard
                      key={prompt.id}
                      prompt={prompt}
                      onOpen={() =>
                        router.push({
                          pathname: '/prompt/[id]',
                          params: { id: prompt.id },
                        })
                      }
                      onCopied={(ok) =>
                        showToast(ok ? toastText.promptCopied : toastText.promptCopyFailed)
                      }
                    />
                  ))}

                  <Pressable
                    onPress={() => void handleNewPrompt(course.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Añadir un prompt a ${course.name}`}
                    style={({ pressed }) => [
                      styles.addPrompt,
                      { opacity: pressed ? 0.72 : 1 },
                    ]}
                  >
                    <Icon name="plus" size={15} color={color.accent} />
                    <Text style={[typography.secondary, { color: color.accent }]}>
                      Añadir un prompt
                    </Text>
                  </Pressable>

                  <View style={styles.courseActions}>
                    <Pressable
                      onPress={() => {
                        setDraftName(course.name);
                        setRenamingId(course.id);
                        setConfirmingId(null);
                      }}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.textAction,
                        { opacity: pressed ? 0.72 : 1 },
                      ]}
                    >
                      <Icon name="pencil-simple" size={14} color={color.neutral[500]} />
                      <Text style={styles.textActionLabel}>Renombrar</Text>
                    </Pressable>

                    {/* Dos toques a propósito: al borrar el ramo se van sus
                        prompts, y un prompt largo no se recupera. */}
                    <Pressable
                      onPress={() => {
                        if (confirming) void handleDelete(course);
                        else setConfirmingId(course.id);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={
                        confirming
                          ? `Confirmar: eliminar ${course.name} y ${promptCount(list.length)}`
                          : `Eliminar ${course.name}`
                      }
                      style={({ pressed }) => [
                        styles.textAction,
                        { opacity: pressed ? 0.72 : 1 },
                      ]}
                    >
                      <Icon
                        name="trash"
                        size={14}
                        color={confirming ? color.accentRamp[400] : color.neutral[500]}
                      />
                      <Text
                        style={[
                          styles.textActionLabel,
                          confirming && { color: color.accentRamp[400] },
                        ]}
                      >
                        {confirming
                          ? list.length === 0
                            ? 'Toca otra vez para eliminar'
                            : `Se irán también ${promptCount(list.length)}`
                          : 'Eliminar'}
                      </Text>
                    </Pressable>
                  </View>
                </Animated.View>
              ) : null}
            </View>
          );
        })}

        <Pressable
          onPress={() => void handleNewCourse()}
          accessibilityRole="button"
          accessibilityLabel="Nuevo ramo"
          style={({ pressed }) => [styles.newCourse, { opacity: pressed ? 0.72 : 1 }]}
        >
          <Icon name="plus" size={16} color={color.neutral[700]} />
          <Text style={[typography.row, { color: color.neutral[500] }]}>Nuevo ramo</Text>
        </Pressable>
      </ScrollView>

      <Toast message={toast} onDismiss={hideToast} />
    </SafeAreaView>
  );
}

/**
 * Un prompt en la lista: nombre, dos líneas de asomo y el botón de copiar.
 *
 * `numberOfLines` es la pieza importante de toda la pantalla. Sin él, el
 * cuadro crece con el texto y la lista se vuelve intransitable.
 */
function PromptCard({
  prompt,
  onOpen,
  onCopied,
}: {
  prompt: Prompt;
  onOpen: () => void;
  onCopied: (ok: boolean) => void;
}) {
  const body = prompt.body.trim();

  const copy = async () => {
    try {
      const ok = await Clipboard.setStringAsync(prompt.body);
      onCopied(ok);
    } catch {
      // Copiar puede fallar en un teléfono con el portapapeles restringido.
      // Silenciarlo dejaría al usuario creyendo que ya lo tiene.
      onCopied(false);
    }
  };

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${promptTitle(prompt.label, prompt.body)}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? color.neutral[900] : color.bg },
      ]}
    >
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {promptTitle(prompt.label, prompt.body)}
        </Text>

        {/* Anidado dentro del otro Pressable: el toque lo atiende este y no
            llega a abrir la pantalla, que es lo que se quiere. */}
        <Touchable
          size={32}
          onPress={() => void copy()}
          accessibilityLabel="Copiar el prompt"
          style={styles.copyButton}
        >
          <Icon name="copy" size={15} color={color.accent} />
        </Touchable>
      </View>

      {body.length > 0 ? (
        <Text style={styles.cardBody} numberOfLines={2}>
          {body}
        </Text>
      ) : (
        <Text style={[styles.cardBody, { color: color.neutral[700] }]}>
          Vacío. Ábrelo y pega el prompt dentro.
        </Text>
      )}

      <Text style={styles.cardMeta}>{charCount(prompt.body.length)}</Text>
    </Pressable>
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
    maxWidth: 300,
  },
  list: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: layout.sectionMarginTop,
    paddingBottom: 24,
    gap: layout.rowGap,
  },
  empty: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 28,
    paddingHorizontal: 12,
  },
  emptyText: {
    ...typography.body,
    color: color.neutral[600],
    textAlign: 'center',
    maxWidth: 280,
  },
  course: {
    borderRadius: radius.md,
  },
  courseOpen: {
    backgroundColor: color.surface,
  },
  courseHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: layout.rowPadding,
  },
  courseTitleArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: layout.rowPadding,
    paddingVertical: layout.rowPadding,
    minHeight: layout.minTouch,
  },
  courseName: {
    ...typography.row,
    color: color.text,
    flex: 1,
  },
  courseNameInput: {
    padding: 0,
  },
  courseCount: {
    ...typography.meta,
    fontSize: 12,
    color: color.neutral[600],
  },
  expanded: {
    paddingHorizontal: layout.rowPadding,
    paddingBottom: layout.rowPadding,
    gap: 8,
  },
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.neutral[800],
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 9,
    gap: 5,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    ...typography.body,
    color: color.text,
    flex: 1,
  },
  copyButton: {
    borderWidth: 1,
    borderColor: color.accentRamp[800],
    borderRadius: radius.sm,
    marginRight: -4,
  },
  cardBody: {
    ...typography.secondary,
    color: color.neutral[500],
  },
  cardMeta: {
    ...typography.meta,
    color: color.neutral[700],
  },
  addPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: layout.minTouch,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.accentRamp[700],
    borderRadius: radius.md,
  },
  courseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    borderTopWidth: 1,
    borderTopColor: color.divider,
    paddingTop: 4,
  },
  textAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: layout.minTouch,
    flexShrink: 1,
  },
  textActionLabel: {
    ...typography.meta,
    fontSize: 12,
    color: color.neutral[500],
    flexShrink: 1,
  },
  newCourse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.neutral[800],
    borderRadius: radius.md,
    padding: layout.rowPadding,
    minHeight: layout.minTouch,
    marginTop: 4,
  },
});
