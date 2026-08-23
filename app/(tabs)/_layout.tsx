/**
 * Barra de pestañas global. Visible en Inicio, Tareas, Buscar y Etiquetas;
 * oculta en Onboarding, NoteEditor, Ajustes y ReminderCreator (esas rutas
 * viven fuera de este grupo).
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
        tabBarLabelStyle: typography.tabLabel,
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
