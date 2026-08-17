/**
 * Estado vacío ilustrado — momento de deleite nº 4.
 *
 * Toda la composición se construye con tokens: círculos, halo y reglas. No hay
 * ninguna imagen. El anillo que respira es la **única animación en bucle** de
 * la app.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { color, motion, type as typography } from '../../theme/tokens';

export function EmptyState({ onLoadSample }: { onLoadSample: () => void }) {
  const breath = useSharedValue(0.35);

  useEffect(() => {
    // tzBreathe: opacidad .35 ↔ .8, 4 s, ease-in-out, infinito.
    breath.value = withRepeat(
      withTiming(0.8, { duration: motion.breathe / 2, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [breath]);

  const innerRing = useAnimatedStyle(() => ({ opacity: breath.value }));

  return (
    <Animated.View entering={FadeInDown.duration(420)} style={styles.wrap}>
      <View style={styles.composition}>
        <View style={styles.outerRing} />
        <Animated.View style={[styles.innerRing, innerRing]} />

        <LinearGradient
          colors={['rgba(145,132,217,0.30)', 'rgba(145,132,217,0)']}
          style={styles.halo}
        />

        <Icon name="sparkle" size={30} color={color.accent} />

        <LinearGradient
          colors={[color.divider, 'transparent']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 0 }}
          style={[styles.sideRule, { left: -34, top: '58%' }]}
        />
        <LinearGradient
          colors={[color.divider, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.sideRule, { right: -34, top: '42%' }]}
        />
      </View>

      <Text style={styles.title}>La página está en blanco</Text>
      <Text style={styles.body}>
        Y eso está bien. Escribe arriba lo primero que se te cruce; ya lo ordenamos
        después.
      </Text>

      <Button label="Ver un ejemplo" variant="secondary" onPress={onLoadSample} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 40,
  },
  composition: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: color.neutral[900],
  },
  innerRing: {
    position: 'absolute',
    top: 18,
    left: 18,
    right: 18,
    bottom: 18,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: color.neutral[800],
  },
  halo: {
    position: 'absolute',
    top: 36,
    left: 36,
    right: 36,
    bottom: 36,
    borderRadius: 24,
  },
  sideRule: {
    position: 'absolute',
    width: 34,
    height: 1,
  },
  title: {
    ...typography.greeting,
    fontSize: 21,
    letterSpacing: -0.42,
    color: color.text,
    marginTop: 4,
  },
  body: {
    ...typography.body,
    lineHeight: 22.4,
    color: color.neutral[500],
    textAlign: 'center',
    maxWidth: 240,
  },
});
