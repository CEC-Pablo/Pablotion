/**
 * Tarjeta de captura: el único elemento protagonista de Inicio.
 *
 * No hay botón «Guardar». Las dos vías de envío son el círculo y Enter.
 */

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Icon, TYPE_ICON } from '../../components/Icon';
import { Touchable } from '../../components/primitives';
import { TYPE_CYCLE, TYPE_LABEL } from '../../i18n';
import {
  color,
  layout,
  motion,
  radius,
  ring,
  shadow,
  type as typography,
} from '../../theme/tokens';
import type { EntryType } from '../../types';
import { detectType } from './detectType';

const EASE = Easing.bezier(...motion.ease);

export function CaptureCard({
  value,
  onChangeText,
  onSubmit,
  detectionEnabled,
  flash,
}: {
  value: string;
  onChangeText: (next: string) => void;
  onSubmit: (type: EntryType) => void;
  /** Con la detección desactivada en Ajustes, todo entra como nota. */
  detectionEnabled: boolean;
  /** Destello del anillo de acento al guardar, 420 ms. */
  flash: boolean;
}) {
  /**
   * El override manual **gana sobre la detección hasta que el usuario vuelve
   * a escribir**. Por eso se limpia en `handleChange`, no en el envío.
   */
  const [override, setOverride] = useState<EntryType | null>(null);

  const hasText = value.trim().length > 0;
  const detected = detectionEnabled ? detectType(value) : 'note';
  const type = override ?? detected;

  const chip = useSharedValue(hasText ? 1 : 0);
  const glow = useSharedValue(0);

  useEffect(() => {
    chip.value = withTiming(hasText ? 1 : 0, {
      duration: motion.detectChip,
      easing: EASE,
    });
  }, [hasText, chip]);

  useEffect(() => {
    if (!flash) return;
    glow.value = withTiming(1, { duration: 120, easing: EASE });
    const timer = setTimeout(() => {
      glow.value = withTiming(0, { duration: motion.captureFlash, easing: EASE });
    }, 120);
    return () => clearTimeout(timer);
  }, [flash, glow]);

  const chipStyle = useAnimatedStyle(() => ({
    opacity: chip.value,
    transform: [{ translateY: 4 * (1 - chip.value) }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    borderColor: glow.value > 0.5 ? color.accent : color.neutral[800],
  }));

  const submitStyle = useAnimatedStyle(() => ({
    borderColor: chip.value > 0.5 ? color.accent : color.neutral[800],
  }));

  const handleChange = (next: string) => {
    if (override !== null) setOverride(null);
    onChangeText(next);
  };

  const handleSubmit = () => {
    if (!hasText) return;
    onSubmit(type);
    setOverride(null);
  };

  const cycleType = () => {
    const index = TYPE_CYCLE.indexOf(type);
    setOverride(TYPE_CYCLE[(index + 1) % TYPE_CYCLE.length]);
  };

  return (
    <View>
      <Animated.View
        style={[
          styles.card,
          cardStyle,
          flash ? { boxShadow: shadow.captureFlash } : null,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={handleChange}
          onSubmitEditing={handleSubmit}
          blurOnSubmit={false}
          returnKeyType="done"
          placeholder="¿Qué tienes en mente?"
          placeholderTextColor={color.neutral[600]}
          selectionColor={color.accent}
          cursorColor={color.accent}
          multiline={false}
          style={styles.input}
          accessibilityLabel="Captura rápida"
        />

        <View style={styles.bottomRow}>
          <Animated.View style={[styles.chipWrap, chipStyle]} pointerEvents={hasText ? 'auto' : 'none'}>
            <View style={styles.chip}>
              <Icon name={TYPE_ICON[type]} size={13} color={color.accent} />
              <Text style={[typography.meta, { fontSize: 12, color: color.accent }]}>
                {TYPE_LABEL[type]}
              </Text>
            </View>
            <Pressable
              onPress={cycleType}
              hitSlop={14}
              accessibilityRole="button"
              accessibilityLabel="Cambiar el tipo detectado"
              style={styles.change}
            >
              <Text style={[typography.meta, { fontSize: 12, color: color.neutral[600] }]}>
                cambiar
              </Text>
            </Pressable>
          </Animated.View>

          <Touchable
            onPress={handleSubmit}
            disabled={!hasText}
            accessibilityLabel="Guardar"
          >
            <Animated.View style={[styles.submit, submitStyle]}>
              <Icon
                name="arrow-up"
                size={17}
                color={hasText ? color.accent : color.neutral[700]}
              />
            </Animated.View>
          </Touchable>
        </View>
      </Animated.View>

      {hasText ? (
        <Text style={styles.microcopy}>Se guarda solo. No hay botón Guardar.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 10,
    ...ring.sm,
  },
  input: {
    ...typography.captureInput,
    color: color.text,
    minHeight: 32,
    padding: 0,
  },
  bottomRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chipWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: color.accent,
    borderRadius: radius.md,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  change: {
    height: layout.minTouch,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  submit: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  microcopy: {
    ...typography.meta,
    color: color.neutral[700],
    marginTop: 6,
    marginLeft: 2,
  },
});
