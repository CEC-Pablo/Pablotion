/**
 * Raíz de la app: fuentes, base de datos, canal de notificaciones y la
 * reconciliación de la ventana deslizante al volver a primer plano.
 */

// Import por subruta a propósito: el barrel `@expo-google-fonts/inter` arrastra
// los nueve pesos al bundle (~4 MB de TTF) aunque solo se usen dos. El sistema
// no pasa de 500 en ningún caso.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View, type AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  ACTION_DONE,
  ensureCategory,
  ensureChannel,
  ensurePermissions,
  reconcileAll,
} from '../src/lib/notifications';
import { useStore } from '../src/store/useStore';
import { color } from '../src/theme/tokens';

/**
 * En iOS, si la app está terminada la notificación se entrega pero no puede
 * ejecutar código al tocarla. Por eso aquí no hay lógica crítica: solo se
 * decide cómo mostrarla. La reconciliación se hace siempre al abrir.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium });
  const load = useStore((s) => s.load);
  const ready = useStore((s) => s.ready);
  const onboarded = useStore((s) => s.settings.onboarded);
  const appState = useRef(AppState.currentState);
  const router = useRouter();
  const [startupError, setStartupError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // El canal, los permisos y la reprogramación son accesorios: si fallan,
      // la app tiene que arrancar igual y avisar por su cuenta. Lo único
      // imprescindible es la base de datos.
      try {
        // El canal va antes de programar nada: sin él, Android descarta las
        // notificaciones en silencio.
        await ensureChannel();
        await ensureCategory();
      } catch {
        // Sin canal no llegarán notificaciones, pero la app es usable.
      }

      try {
        await load();
      } catch (error) {
        // Antes esto dejaba `ready` en false para siempre y la app se quedaba
        // en un fondo sólido sin decir nada. Ahora al menos se ve qué pasó.
        if (!cancelled) setStartupError(String(error));
        return;
      }

      if (cancelled) return;

      try {
        await ensurePermissions();
        await reconcileAll();
      } catch {
        // Idem: no bloquea el arranque.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    // Al volver a primer plano se repone la ventana: se descartan las
    // ocurrencias ya disparadas y se vuelve a llenar hasta N. Esto cubre
    // también los cambios de zona horaria y de horario de verano.
    const onChange = (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        void reconcileAll();
      }
      appState.current = next;
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    // El botón «Hecho» de la notificación. Es la forma de parar un
    // recordatorio insistente sin abrir la app y buscarlo a mano.
    //
    // En iOS, con la app terminada, no se puede ejecutar código al tocar la
    // notificación: la respuesta llega cuando la app arranca. Por eso esto no
    // es el mecanismo, solo un atajo — la reconciliación al abrir es la que
    // garantiza el estado.
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.actionIdentifier !== ACTION_DONE) return;

      const entryId = response.notification.request.content.data?.entryId;
      if (typeof entryId === 'string') {
        void useStore.getState().setCompleted(entryId, true);
      }
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    // El onboarding entra directo a Inicio y no vuelve a aparecer. No hay
    // pantalla de login: la v1 va sin cuenta (§3.4).
    if (ready && !onboarded) router.replace('/onboarding');
  }, [ready, onboarded, router]);

  if (startupError) {
    // Sin `fontFamily` a propósito: si las fuentes no cargaron, esta pantalla
    // tiene que verse igual.
    return (
      <View style={styles.errorScreen}>
        <Text style={styles.errorTitle}>Pablotion no pudo arrancar</Text>
        <Text style={styles.errorBody}>{startupError}</Text>
      </View>
    );
  }

  if (!fontsLoaded || !ready) {
    return <View style={{ flex: 1, backgroundColor: color.bg }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: color.bg },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="note/[id]" />
          <Stack.Screen name="prompt/[id]" />
          <Stack.Screen
            name="reminder/[id]"
            options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
          />
          {/* La hoja del calendario hereda el fundido del stack y se anima
              además por dentro: el oscurecido aparece y la tarjeta sube desde
              abajo. Con `slide_from_bottom` subiría el conjunto entero y se
              vería el rectángulo oscuro trepando por la pantalla. */}
          <Stack.Screen
            name="day/[date]"
            options={{ presentation: 'transparentModal' }}
          />
          <Stack.Screen name="settings" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 12,
  },
  errorTitle: {
    fontSize: 20,
    color: color.text,
    textAlign: 'center',
  },
  errorBody: {
    fontSize: 13,
    lineHeight: 20,
    color: color.neutral[400],
    textAlign: 'center',
  },
});
