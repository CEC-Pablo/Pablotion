/**
 * QuickCapture (Inicio) — la pantalla protagonista.
 *
 * Anotar cualquier cosa sin decidir nada primero: escribir y enviar. La lista
 * agrupa por día derivando el grupo de `created_at`, nunca de una cadena fija.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../src/components/Icon';
import { Toast } from '../../src/components/Toast';
import { FadingRule, Kicker, Touchable } from '../../src/components/primitives';
import { CaptureCard } from '../../src/features/capture/CaptureCard';
import { EmptyState } from '../../src/features/capture/EmptyState';
import { EntryRow } from '../../src/features/capture/EntryRow';
import { loadSampleData } from '../../src/features/capture/sample';
import { SelectionBar } from '../../src/features/capture/SelectionBar';
import {
  TYPE_CYCLE,
  TYPE_LABEL_PLURAL,
  greeting,
  thingCount,
  toast as toastText,
} from '../../src/i18n';
import { DAY_GROUP_LABEL, dayGroup, headerDate, type DayGroup } from '../../src/lib/dates';
import { useStore } from '../../src/store/useStore';
import { color, layout, motion, pull, type as typography } from '../../src/theme/tokens';
import type { Entry, EntryType } from '../../src/types';

const EASE = Easing.bezier(...motion.ease);

export default function QuickCapture() {
  const router = useRouter();
  // Buscar sin resultados ofrece «Crear una nota con ese texto» y vuelve aquí
  // con la consulta ya cargada en el input de captura.
  const { draft: incoming } = useLocalSearchParams<{ draft?: string }>();
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (incoming) setDraft(incoming);
  }, [incoming]);

  const [flash, setFlash] = useState(false);
  /** Modo selección: vacío = apagado. Es estado de UI, no va a la base. */
  const [selected, setSelected] = useState<string[]>([]);
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const [upToDate, setUpToDate] = useState(false);

  const entries = useStore((s) => s.entries);
  const tags = useStore((s) => s.tags);
  const detect = useStore((s) => s.settings.detect);
  const addEntry = useStore((s) => s.addEntry);
  const toggleTask = useStore((s) => s.toggleTask);
  const removeEntries = useStore((s) => s.removeEntries);
  const assignTag = useStore((s) => s.assignTag);
  const refresh = useStore((s) => s.refresh);
  const toast = useStore((s) => s.toast);
  const showToast = useStore((s) => s.showToast);
  const hideToast = useStore((s) => s.hideToast);

  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  /* --------------------------------------------------------- pull-to-refresh */

  const scrollY = useSharedValue(0);
  const pullHeight = useSharedValue(0);
  const spin = useSharedValue(0);

  const finishRefresh = useCallback(async () => {
    await refresh();
    setUpToDate(true);
    showToast(toastText.upToDate);
    setTimeout(() => setUpToDate(false), motion.toastDismiss);
  }, [refresh, showToast]);

  const startSpin = useCallback(() => {
    spin.value = 0;
    spin.value = withRepeat(
      withTiming(360, { duration: motion.spin, easing: Easing.linear }),
      -1,
      false
    );
    setTimeout(() => {
      spin.value = 0;
      pullHeight.value = withTiming(0, { duration: 260, easing: EASE });
    }, motion.spin);
    void finishRefresh();
  }, [spin, pullHeight, finishRefresh]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Solo desde arriba del todo y solo hacia abajo.
      if (scrollY.value > 0 || event.translationY <= 0) return;
      pullHeight.value = Math.min(pull.max, event.translationY * pull.resistance);
    })
    .onEnd(() => {
      // Sin `easing` a propósito: estas dos llamadas corren dentro del worklet
      // del gesto, y el diseño solo fija duraciones para el pull, no curvas.
      if (pullHeight.value >= pull.threshold) {
        pullHeight.value = withTiming(pull.settled, { duration: 160 });
        runOnJS(startSpin)();
      } else {
        pullHeight.value = withTiming(0, { duration: 260 });
      }
    });

  const pullZoneStyle = useAnimatedStyle(() => ({
    height: pullHeight.value,
    // El icono sube de opacidad hasta los 46 px de arrastre.
    opacity: Math.min(1, pullHeight.value / pull.threshold),
  }));

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  /* --------------------------------------------------------------- captura */

  const handleSubmit = async (type: EntryType) => {
    const title = draft.trim();
    if (!title) return;

    setDraft('');
    setFlash(true);
    setTimeout(() => setFlash(false), motion.captureFlash);

    const entry = await addEntry({ type, title });
    showToast(toastText.saved(type));

    // El fondo `accent-900` de la fila nueva se limpia a los 900 ms.
    setEnteringId(entry.id);
    setTimeout(() => setEnteringId(null), motion.enterClear);
  };

  /* ------------------------------------------------------------- selección */

  const selectionMode = selected.length > 0;

  const toggleSelected = (entryId: string) =>
    setSelected((current) =>
      current.includes(entryId)
        ? current.filter((x) => x !== entryId)
        : [...current, entryId]
    );

  const handleRowPress = (entryId: string) => {
    // En modo selección el toque alterna en vez de abrir la nota.
    if (selectionMode) toggleSelected(entryId);
    else router.push(`/note/${entryId}`);
  };

  const handleDeleteSelected = async () => {
    const count = selected.length;
    await removeEntries(selected);
    setSelected([]);
    showToast(count === 1 ? toastText.deleted : `${count} eliminadas`);
  };

  const handleAssignTag = async (tagId: string | null) => {
    await assignTag(selected, tagId);
    setSelected([]);
    showToast(tagId ? 'Etiqueta aplicada' : 'Etiqueta quitada');
  };

  const handleSample = async () => {
    await loadSampleData();
    await refresh();
  };

  /* ----------------------------------------------------------------- lista */

  const groups = useMemo(() => groupByDayAndType(entries), [entries]);
  const isEmpty = entries.length === 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Kicker style={upToDate ? { color: color.accent } : undefined}>
            {headerDate()}
            {upToDate ? ' · al día' : ''}
          </Kicker>
          <Text style={styles.greeting}>{greeting()}</Text>
        </View>
        <Touchable
          onPress={() => router.push('/settings')}
          accessibilityLabel="Ajustes"
        >
          <Icon name="gear-six" size={22} color={color.neutral[400]} />
        </Touchable>
      </View>

      <View style={styles.captureWrap}>
        <CaptureCard
          value={draft}
          onChangeText={setDraft}
          onSubmit={handleSubmit}
          detectionEnabled={detect}
          flash={flash}
        />
      </View>

      <GestureDetector gesture={panGesture}>
        <View style={{ flex: 1 }}>
          <Animated.View style={[styles.pullZone, pullZoneStyle]}>
            <Animated.View style={spinStyle}>
              <Icon name="sparkle" size={18} color={color.accent} />
            </Animated.View>
          </Animated.View>

          <ScrollView
            onScroll={(e) => {
              scrollY.value = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
          >
            {isEmpty ? (
              <EmptyState onLoadSample={handleSample} />
            ) : (
              groups.map((section) => (
                <View key={section.day} style={styles.group}>
                  <Text style={styles.dayLabel}>{DAY_GROUP_LABEL[section.day]}</Text>

                  {section.types.map(({ type, items }) => (
                    <View key={type} style={styles.typeGroup}>
                      <View style={styles.groupHeader}>
                        <Kicker>{TYPE_LABEL_PLURAL[type]}</Kicker>
                        <FadingRule oneSided style={styles.groupRule} />
                        <Text style={styles.count}>{thingCount(items.length)}</Text>
                      </View>

                      {items.map((entry) => (
                        <EntryRow
                          key={entry.id}
                          entry={entry}
                          tag={entry.tag_id ? tagById.get(entry.tag_id) : undefined}
                          entering={entry.id === enteringId}
                          selectionMode={selectionMode}
                          selected={selected.includes(entry.id)}
                          onPress={() => handleRowPress(entry.id)}
                          onLongPress={() => toggleSelected(entry.id)}
                          onToggle={() => void toggleTask(entry.id)}
                        />
                      ))}
                    </View>
                  ))}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </GestureDetector>

      {selectionMode ? (
        <SelectionBar
          count={selected.length}
          tags={tags}
          onCancel={() => setSelected([])}
          onDelete={() => void handleDeleteSelected()}
          onAssignTag={(tagId) => void handleAssignTag(tagId)}
        />
      ) : (
        <Toast message={toast} onDismiss={hideToast} />
      )}
    </SafeAreaView>
  );
}

interface DaySection {
  day: DayGroup;
  /** Solo los tipos que tienen algo ese día; nunca un subgrupo vacío. */
  types: { type: EntryType; items: Entry[] }[];
}

/**
 * Los grupos salen de `created_at`, nunca de una cadena fija. El día es el eje
 * principal (Hoy → Ayer → Antes) y dentro de cada uno se subdivide por tipo,
 * para que las notas no se mezclen con las tareas y los recordatorios.
 */
function groupByDayAndType(entries: Entry[]): DaySection[] {
  const dayOrder: DayGroup[] = ['today', 'yesterday', 'older'];
  const byDay = new Map<DayGroup, Entry[]>();

  for (const entry of entries) {
    const day = dayGroup(new Date(entry.created_at));
    const list = byDay.get(day) ?? [];
    list.push(entry);
    byDay.set(day, list);
  }

  return dayOrder
    .filter((day) => byDay.has(day))
    .map((day) => {
      const dayEntries = byDay.get(day)!;
      return {
        day,
        types: TYPE_CYCLE.map((type) => ({
          type,
          items: dayEntries.filter((e) => e.type === type),
        })).filter((section) => section.items.length > 0),
      };
    });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 16,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 10,
  },
  greeting: {
    ...typography.greeting,
    color: color.text,
    marginTop: 2,
  },
  captureWrap: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 10,
  },
  pullZone: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  list: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 24,
  },
  group: {
    marginTop: layout.sectionMarginTop,
  },
  dayLabel: {
    ...typography.secondary,
    color: color.neutral[500],
    marginBottom: 4,
  },
  typeGroup: {
    marginTop: 12,
    gap: layout.rowGap,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
  },
  groupRule: {
    flex: 1,
  },
  count: {
    ...typography.meta,
    color: color.neutral[700],
  },
});
