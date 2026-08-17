/**
 * Ajustes. Se llega desde el engranaje de Inicio.
 *
 * «Guardado automático» aparece pero es un interruptor fijo en on al 45 % de
 * opacidad: el brief exige que no exista botón Guardar, así que el ajuste no
 * se puede apagar.
 */

import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../src/components/Icon';
import { Switch } from '../src/components/Switch';
import { Kicker, Touchable } from '../src/components/primitives';
import { useStore } from '../src/store/useStore';
import {
  color,
  layout,
  radius,
  type as typography,
} from '../src/theme/tokens';

export default function Settings() {
  const router = useRouter();
  const settings = useStore((s) => s.settings);
  const setSetting = useStore((s) => s.setSetting);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.bar}>
        <Touchable onPress={() => router.back()} accessibilityLabel="Volver">
          <Icon name="arrow-left" size={20} color={color.neutral[400]} />
        </Touchable>
        <Text style={styles.title}>Ajustes</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.account}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>PC</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.row, { color: color.text }]}>Pablo</Text>
            <Text style={styles.accountMeta}>Centro de Estudiantes · plan gratuito</Text>
          </View>
          <Icon name="caret-right" size={14} color={color.neutral[600]} />
        </View>

        <Section title="Notificaciones">
          <Row label="Sonido">
            <Switch
              value={settings.sound}
              onChange={(next) => void setSetting('sound', next)}
              accessibilityLabel="Sonido"
            />
          </Row>
          <Row label="Resumen diario" hint="Todos los días a las 8:00">
            <Switch
              value={settings.digest}
              onChange={(next) => void setSetting('digest', next)}
              accessibilityLabel="Resumen diario"
            />
          </Row>
          <Row label="No molestar" hint="De 22:00 a 7:00">
            <Switch
              value={settings.dnd}
              onChange={(next) => void setSetting('dnd', next)}
              accessibilityLabel="No molestar"
            />
          </Row>
        </Section>

        <Section title="Captura">
          <Row label="Detección de tipo" hint="Nota, tarea o recordatorio, al escribir">
            <Switch
              value={settings.detect}
              onChange={(next) => void setSetting('detect', next)}
              accessibilityLabel="Detección de tipo"
            />
          </Row>
          <Row label="Guardado automático" hint="Siempre activo">
            <Switch value locked accessibilityLabel="Guardado automático" />
          </Row>
        </Section>

        <Section title="Apariencia">
          <Row label="Tema">
            <View style={styles.segmented}>
              {(['dark', 'system'] as const).map((option, index) => {
                const active = settings.theme === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => void setSetting('theme', option)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[
                      styles.segment,
                      index === 1 && styles.segmentDivider,
                      active && { borderColor: color.accent, borderWidth: 1 },
                    ]}
                  >
                    <Text
                      style={[
                        typography.secondary,
                        { color: active ? color.accent : color.neutral[400] },
                      ]}
                    >
                      {option === 'dark' ? 'Oscuro' : 'Sistema'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Row>
        </Section>

        <Section title="Datos">
          <Row label="Exportar todo">
            <View style={styles.valueRow}>
              <Text style={styles.value}>Markdown</Text>
              <Icon name="caret-right" size={14} color={color.neutral[600]} />
            </View>
          </Row>
          <Row label="Sincronización">
            <View style={styles.valueRow}>
              {/* La v1 va sin cuenta: los datos viven en este teléfono (§3.4). */}
              <Text style={styles.value}>Solo en este dispositivo</Text>
            </View>
          </Row>
        </Section>

        <Text style={styles.footer}>
          Trazo · versión 0.1 · hecho para el Centro de Estudiantes
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: layout.sectionMarginTop }}>
      <Kicker style={{ marginBottom: 4 }}>{title}</Kicker>
      {children}
    </View>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={[typography.row, { color: color.text }]}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
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
    gap: 8,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 6,
  },
  title: {
    ...typography.preview,
    color: color.text,
  },
  body: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 32,
  },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: color.accentRamp[900],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.secondary,
    color: color.accentRamp[300],
  },
  accountMeta: {
    ...typography.meta,
    fontSize: 12,
    color: color.neutral[600],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    minHeight: layout.minTouch,
  },
  hint: {
    ...typography.meta,
    fontSize: 12,
    color: color.neutral[600],
    marginTop: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: {
    ...typography.secondary,
    color: color.neutral[400],
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: color.divider,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  segment: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentDivider: {
    borderLeftWidth: 1,
    borderLeftColor: color.divider,
  },
  footer: {
    ...typography.meta,
    color: color.neutral[700],
    textAlign: 'center',
    marginTop: 32,
  },
});
