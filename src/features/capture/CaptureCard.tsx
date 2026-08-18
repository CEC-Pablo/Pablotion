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
          {/* Los tres tipos a la vista. El detectado aparece marcado y tocar
              otro fija el override, sin tener que ciclar a ciegas. */}
          <Animated.View
            style={[styles.typeRow, chipStyle]}
            pointerEvents={hasText ? 'auto' : 'none'}
          >
            {TYPE_CYCLE.map((option) => {
              const active = option === type;
              return (
                <Pressable
                  key={option}
                  onPress={() => setOverride(option)}
                  hitSlop={{ top: 5, bottom: 5, left: 0, right: 0 }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={TYPE_LABEL[option]}
                  style={({ pressed }) => [
                    styles.typeOption,
                    active && { borderColor: color.accent },
                    { opacity: pressed ? 0.72 : 1 },
                  ]}
                >
                  <Icon
                    name={TYPE_ICON[option]}
                    size={13}
                    color={active ? color.accent : color.neutral[600]}
                  />
                  <Text
                    numberOfLines={1}
                    style={[styles.typeLabel, active && { color: color.accent }]}
                  >
                    {TYPE_LABEL[option]}
                  </Text>
                </Pressable>
              );
            })}
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
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: color.divider,
    borderRadius: radius.md,
    paddingHorizontal: 8,
    // 34 px pintados + 5 px de hitSlop arriba y abajo = los 44 px de rigor.
    minHeight: 34,
  },
  typeLabel: {
    ...typography.meta,
    fontSize: 12,
    color: color.neutral[600],
    flexShrink: 1,
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
