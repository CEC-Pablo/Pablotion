/**
 * Buscar — filtrado instantáneo mientras se escribe.
 *
 * La comparación ignora acentos y mayúsculas, pero el texto se pinta con sus
 * acentos originales: el resaltado parte la cadena original según el índice
 * hallado en la versión normalizada.
 */

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { Icon, TYPE_ICON } from '../../src/components/Icon';
import { Kicker, TagDot, Touchable } from '../../src/components/primitives';
import { resultCount } from '../../src/i18n';
import { matches, splitOnMatch } from '../../src/lib/normalize';
import { useStore } from '../../src/store/useStore';
import {
  color,
  layout,
  radius,
  ring,
  type as typography,
} from '../../src/theme/tokens';
import type { Entry } from '../../src/types';

const SUGGESTIONS = ['beca', 'ensayo', 'centro'];

export default function Search() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const entries = useStore((s) => s.entries);
  const tags = useStore((s) => s.tags);
  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  const trimmed = query.trim();
  const results = useMemo(
    () =>
      trimmed
        ? entries.filter((e) => matches(e.title, trimmed) || matches(e.body, trimmed))
        : [],
    [entries, trimmed]
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.field}>
          <Icon name="magnifying-glass" size={17} color={color.neutral[500]} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar en todo"
            placeholderTextColor={color.neutral[600]}
            selectionColor={color.accent}
            style={styles.input}
            accessibilityLabel="Buscar"
          />
          {query.length > 0 ? (
            <Touchable
              size={20}
              onPress={() => setQuery('')}
              accessibilityLabel="Limpiar búsqueda"
            >
              <Icon name="x" size={15} color={color.neutral[500]} />
            </Touchable>
          ) : null}
        </View>

        {!trimmed ? (
          <View style={styles.suggestions}>
            {SUGGESTIONS.map((suggestion) => (
              <Chip
                key={suggestion}
                label={suggestion}
                onPress={() => setQuery(suggestion)}
              />
            ))}
          </View>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        <Kicker style={styles.kicker}>
          {trimmed ? resultCount(results.length) : 'Sugerencias'}
        </Kicker>

        {trimmed && results.length === 0 ? (
          <View style={styles.noResults}>
            <Icon name="wind" size={26} color={color.neutral[700]} />
            <Text style={[typography.body, { color: color.neutral[500] }]}>
              Nada con «{trimmed}».
            </Text>
            <Button
              label="Crear una nota con ese texto"
              onPress={() => router.push({ pathname: '/', params: { draft: trimmed } })}
            />
          </View>
        ) : null}

        {(trimmed ? results : entries.slice(0, 6)).map((entry) => (
          <ResultRow
            key={entry.id}
            entry={entry}
            query={trimmed}
            tagColor={entry.tag_id ? tagById.get(entry.tag_id)?.color : undefined}
            tagName={entry.tag_id ? tagById.get(entry.tag_id)?.name : undefined}
            onPress={() => router.push(`/note/${entry.id}`)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function ResultRow({
  entry,
  query,
  tagColor,
  tagName,
  onPress,
}: {
  entry: Entry;
  query: string;
  tagColor?: string;
  tagName?: string;
  onPress: () => void;
}) {
  const split = query ? splitOnMatch(entry.title, query) : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.result,
        { backgroundColor: pressed ? color.neutral[900] : 'transparent' },
      ]}
    >
      <Icon
        name={TYPE_ICON[entry.type]}
        size={17}
        color={entry.type === 'reminder' ? color.accent : color.neutral[600]}
      />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[typography.body, { color: color.text }]} numberOfLines={2}>
          {split ? (
            <>
              {split.pre}
              <Text style={styles.hit}>{split.hit}</Text>
              {split.post}
            </>
          ) : (
            entry.title
          )}
        </Text>
        {tagColor && tagName ? (
          <View style={styles.metaItem}>
            <TagDot color={tagColor} />
            <Text style={styles.metaText}>{tagName}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
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
    gap: 10,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    ...ring.sm,
  },
  input: {
    ...typography.row,
    color: color.text,
    flex: 1,
    padding: 0,
  },
  suggestions: {
    flexDirection: 'row',
    gap: 8,
  },
  list: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 24,
  },
  kicker: {
    marginTop: layout.sectionMarginTop,
    marginBottom: 6,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: layout.rowPadding,
    borderRadius: radius.md,
  },
  hit: {
    backgroundColor: color.accentRamp[900],
    color: color.accentRamp[300],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    ...typography.meta,
    color: color.neutral[600],
  },
  noResults: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 40,
  },
});
