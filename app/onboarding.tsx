/**
 * Onboarding: tres pasos antes del primer uso. Ambos botones llevan a Inicio.
 *
 * Es una sola pantalla con estado de paso, como el `onbStep` del prototipo:
 * los tres pasos comparten marca, layout y fila de navegación.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../src/components/Button';
import { Chip } from '../src/components/Chip';
import { Icon } from '../src/components/Icon';
import { useStore } from '../src/store/useStore';
import { color, layout, radius, ring, type as typography } from '../src/theme/tokens';

const STEPS = 3;

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const setSetting = useStore((s) => s.setSetting);

  const finish = async () => {
    await setSetting('onboarded', true);
    router.replace('/');
  };

  const next = () => (step < STEPS - 1 ? setStep(step + 1) : void finish());

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.brand}>
        <View style={styles.brandRule} />
        <Text style={styles.brandName}>PABLOTION</Text>
      </View>

      <Animated.View key={step} entering={FadeIn.duration(260)} style={styles.content}>
        {step === 0 ? <StepOne /> : step === 1 ? <StepTwo /> : <StepThree />}
      </Animated.View>

      <View style={styles.nav}>
        <View style={styles.dots}>
          {Array.from({ length: STEPS }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === step ? color.accent : color.neutral[800] },
              ]}
            />
          ))}
        </View>

        <View style={styles.navButtons}>
          <Pressable
            onPress={finish}
            accessibilityRole="button"
            style={({ pressed }) => [styles.skip, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[typography.secondary, { color: color.neutral[500] }]}>
              Saltar
            </Text>
          </Pressable>
          <Button
            label={step === STEPS - 1 ? 'Empezar' : 'Siguiente'}
            iconAfter="arrow-right"
            onPress={next}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function StepOne() {
  return (
    <>
      <View style={{ gap: 10, marginBottom: 6 }}>
        <Rule width="100%" tint={color.accent} />
        <Rule width="72%" tint={color.divider} />
        <Rule width="44%" tint={color.divider} />
      </View>
      <Text style={styles.headline}>{'Anota antes\nde que se te\nolvide.'}</Text>
      <Text style={styles.body}>
        Tres segundos, sin carpetas ni ceremonias. Menos pasos, no menos personalidad.
      </Text>
    </>
  );
}

function StepTwo() {
  return (
    <>
      <View style={styles.chipRow}>
        <Chip label="recordatorio" icon="bell" active />
        <Chip label="tarea" icon="check-square-offset" />
      </View>
      <Text style={styles.headline}>{'Escribe.\nNo organices.'}</Text>
      <Text style={styles.body}>
        Pablotion reconoce si lo que escribiste es una nota, una tarea o un recordatorio. Si
        se equivoca, lo cambias con un toque.
      </Text>
    </>
  );
}

function StepThree() {
  return (
    <>
      <View style={styles.sampleCard}>
        <Icon name="bell-ringing" size={17} color={color.accent} />
        <Text style={[typography.secondary, { color: color.neutral[300] }]}>
          martes 18 de agosto, 9:00
        </Text>
      </View>
      <Text style={styles.headline}>{'Recordatorios\nque sí avisan.'}</Text>
      <Text style={styles.body}>
        Fecha y frecuencia en una sola pantalla, con la próxima notificación a la vista
        antes de confirmar.
      </Text>
    </>
  );
}

/** Las reglas del paso 1 se desvanecen hacia la derecha. */
function Rule({ width, tint }: { width: string; tint: string }) {
  return (
    <LinearGradient
      colors={[tint, 'transparent']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ height: 1, width: width as never }}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
    paddingTop: 40,
    paddingHorizontal: 28,
    paddingBottom: 28,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandRule: {
    width: 22,
    height: 1,
    backgroundColor: color.accent,
  },
  brandName: {
    ...typography.meta,
    fontSize: 12,
    letterSpacing: 2.64,
    color: color.accent,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  headline: {
    ...typography.onboardingTitle,
    color: color.text,
  },
  body: {
    ...typography.row,
    lineHeight: 24,
    color: color.neutral[400],
    maxWidth: 300,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  sampleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
    backgroundColor: color.surface,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 6,
    ...ring.sm,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 18,
    height: 3,
    borderRadius: 2,
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  skip: {
    height: layout.minTouch,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
