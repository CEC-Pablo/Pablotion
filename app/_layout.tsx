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
import { useEffect, useRef } from 'react';
import { AppState, View, type AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ensureChannel, ensurePermissions, reconcileAll } from '../src/lib/notifications';
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

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // El canal va antes de programar nada: sin él, Android descarta las
      // notificaciones en silencio.
      await ensureChannel();
      await load();
      if (cancelled) return;
      await ensurePermissions();
      await reconcileAll();
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
    // El onboarding entra directo a Inicio y no vuelve a aparecer. No hay
    // pantalla de login: la v1 va sin cuenta (§3.4).
    if (ready && !onboarded) router.replace('/onboarding');
  }, [ready, onboarded, router]);

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
          <Stack.Screen
            name="reminder/[id]"
            options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="settings" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
