/**
 * Tarjeta «Próxima notificación» — momento de deleite nº 5.
 *
 * Siempre visible al final del ReminderCreator y recalculada en vivo con cada
 * cambio. Con el aviso previo activo muestra una tercera línea: el disparo
 * principal y el aviso.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../components/Icon';
import { Kicker } from '../../components/primitives';
import { color, radius, shadow, type as typography } from '../../theme/tokens';
import type { Preview } from './preview';

export function PreviewCard({ preview }: { preview: Preview }) {
  return (
    <LinearGradient
      // `linear-gradient(160deg, accent-900, surface 70%)` aproximado con
      // start/end: RN no admite ángulos en grados.
      colors={[color.accentRamp[900], color.surface]}
      locations={[0, 0.7]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.card}
    >
      <View style={styles.head}>
        <Icon name="bell-ringing" size={15} color={color.accent} />
        <Kicker style={{ color: color.accent }}>Próxima notificación</Kicker>
      </View>

      <Text style={styles.headline}>{preview.headline}</Text>
      <Text style={styles.repeat}>{preview.repeat}</Text>

      {preview.relative ? (
        <Text style={styles.repeat}>{preview.relative}</Text>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: color.accentRamp[700],
    boxShadow: shadow.accentLift,
    gap: 6,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headline: {
    ...typography.preview,
    color: color.text,
    textTransform: 'capitalize',
  },
  repeat: {
    ...typography.secondary,
    color: color.neutral[400],
  },
});
