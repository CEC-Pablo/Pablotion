/**
 * Barra de pestañas global. Visible en Inicio, Tareas, Calendario, Ramos,
 * Buscar y Etiquetas; oculta en Onboarding, NoteEditor, Ajustes,
 * ReminderCreator, PromptEditor y la hoja de día (esas rutas viven fuera de
 * este grupo).
 */

import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { Icon, type IconName } from '../../src/components/Icon';
import { color, type as typography } from '../../src/theme/tokens';

function tabIcon(name: IconName) {
  // `tabBarIcon` entrega un `ColorValue`, que puede ser un color opaco de
  // plataforma; Phosphor solo acepta cadenas.
  return ({ color: tint }: { color: ColorValue }) => (
    <Icon name={name} size={20} color={typeof tint === 'string' ? tint : color.neutral[600]} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.accent,
        tabBarInactiveTintColor: color.neutral[600],
        sceneStyle: { backgroundColor: color.bg },
        tabBarStyle: {
          backgroundColor: color.bg,
          minHeight: 52,
          borderTopWidth: 1,
          // El separador del diseño es `box-shadow: 0 -1px 0 neutral-900`.
          borderTopColor: color.neutral[900],
          elevation: 0,
        },
        // Con seis pestañas «Calendario» ya no cabe al tamaño del token, y una
        // etiqueta cortada a la mitad se lee peor que una medio punto más
        // pequeña. El resto del sistema tipográfico no se toca.
        tabBarLabelStyle: { ...typography.tabLabel, fontSize: 9.5, letterSpacing: 0.2 },
        tabBarItemStyle: { paddingHorizontal: 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Inicio', tabBarIcon: tabIcon('house') }}
      />
      <Tabs.Screen
        name="tasks"
        options={{ title: 'Tareas', tabBarIcon: tabIcon('check-square-offset') }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ title: 'Calendario', tabBarIcon: tabIcon('calendar-blank') }}
      />
      <Tabs.Screen
        name="prompts"
        options={{ title: 'Ramos', tabBarIcon: tabIcon('graduation-cap') }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: 'Buscar', tabBarIcon: tabIcon('magnifying-glass') }}
      />
      <Tabs.Screen
        name="tags"
        options={{ title: 'Etiquetas', tabBarIcon: tabIcon('tag') }}
      />
    </Tabs>
  );
}
