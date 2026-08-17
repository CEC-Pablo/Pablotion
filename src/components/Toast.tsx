/**
 * Toast global. Entra con `tzRise` (240 ms) y **se cierra solo a los 2600 ms**.
 *
 * Se sitúa a 80 px del borde inferior cuando hay barra de pestañas y a 24 px
 * cuando no.
 */

import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { color, motion, radius, shadow, type as typography } from '../theme/tokens';
import { Icon } from './Icon';

export function Toast({
  message,
  onDismiss,
  withTabBar = true,
}: {
  message: string | null;
  onDismiss: () => void;
  withTabBar?: boolean;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, motion.toastDismiss);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(motion.toastRise)}
      exiting={FadeOut.duration(160)}
      pointerEvents="none"
      style={[styles.toast, { bottom: withTabBar ? 80 : 24 }]}
    >
      <Icon name="check-circle" size={17} color={color.accent} />
      <View style={styles.textWrap}>
        <Text style={[typography.secondary, { color: color.text }]} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: color.accentRamp[700],
    boxShadow: shadow.accentLift,
    zIndex: 10,
  },
  textWrap: {
    flexShrink: 1,
  },
});
