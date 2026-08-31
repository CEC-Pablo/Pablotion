/**
 * Programación real de notificaciones locales (§6.3).
 *
 * La estrategia es una **ventana deslizante**: se programa la serie de las
 * próximas N ocurrencias, no solo la primera. Recalcular `next_trigger_at`
 * tras cada disparo no puede funcionar aquí — cuando la notificación diaria
 * salta con la app terminada no hay código nuestro corriendo, así que la
 * segunda no llegaría nunca.
 *
 * `next_trigger_at` en la base es la primera ocurrencia pendiente: sirve para
 * pintar la UI y para reponer, nunca como mecanismo de disparo.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { RELATIVE_LABEL } from '../../i18n';
import {
  forgetScheduledForRule,
  getEntriesByIds,
  listActiveRules,
  listRules,
  listScheduled,
  recordScheduled,
  setRuleNextTrigger,
} from '../db/queries';
import {
  allocateWindow,
  primaryOccurrences,
  relativeFromDue,
  relativeOccurrences,
  type RulePlan,
} from '../../features/reminders/occurrences';
import type { Entry, NotificationRule } from '../../types';

export const CHANNEL_ID = 'trazo-reminders';

/** Categoría que da a la notificación su botón «Hecho». */
export const CATEGORY_ID = 'trazo-reminder';

/** Identificador de la acción; se compara al recibir la respuesta. */
export const ACTION_DONE = 'done';

/**
 * Registra el botón «Hecho» de la notificación.
 *
 * Es la única forma de parar un recordatorio insistente sin abrir la app y
 * buscarlo. `opensAppToForeground: false` evita que el teléfono salte a la app
 * al pulsarlo; en Android la respuesta se procesa igualmente al arrancar.
 */
export async function ensureCategory(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
    {
      identifier: ACTION_DONE,
      buttonTitle: 'Hecho',
      options: { opensAppToForeground: false },
    },
  ]);
}

/**
 * En Android hay que crear el canal **antes** de programar nada, o el sistema
 * descarta las notificaciones en silencio. Se llama al arrancar la app.
 */
export async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Recordatorios',
    importance: Notifications.AndroidImportance.HIGH,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    lightColor: '#9184d9',
    vibrationPattern: [0, 250, 250, 250],
  });
}

export async function ensurePermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }
  if (!current.canAskAgain) return false;

  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return (
    asked.granted ||
    asked.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

/** Cancela por identificador guardado y olvida las filas. Nunca acumular. */
async function clearRule(ruleId: string): Promise<void> {
  const rows = await listScheduled(ruleId);
  await Promise.all(
    rows.map((row) =>
      Notifications.cancelScheduledNotificationAsync(row.notification_id).catch(() => {
        // Ya no existía (disparada o cancelada por el sistema): da igual, la
        // fila se borra igualmente justo debajo.
      })
    )
  );
  await forgetScheduledForRule(ruleId);
}

function contentFor(entry: Entry, rule: NotificationRule): Notifications.NotificationContentInput {
  const isRelative = rule.kind === 'relative';
  const label = rule.relative_offset_minutes
    ? RELATIVE_LABEL[rule.relative_offset_minutes]
    : null;

  return {
    title: entry.title || 'Pablotion',
    body: isRelative && label ? label : entry.body || 'Toca para abrirlo',
    data: { entryId: entry.id, ruleId: rule.id, kind: rule.kind },
    categoryIdentifier: CATEGORY_ID,
    sound: true,
  };
}

/** Calcula la serie de una regla. No programa nada: solo decide las fechas. */
function occurrencesForRule(
  rule: NotificationRule,
  entry: Entry,
  primariesByEntry: Map<string, Date[]>,
  now: Date
): Date[] {
  if (!entry.due_at) return [];
  const dueAt = new Date(entry.due_at);

  if (rule.kind === 'primary') {
    const out = primaryOccurrences(
      {
        frequency: rule.frequency ?? 'once',
        weeklyDay: rule.weekly_day,
        customInterval: rule.custom_interval,
        customUnit: rule.custom_unit,
      },
      dueAt,
      now
    );
    primariesByEntry.set(entry.id, out);
    return out;
  }

  const offset = rule.relative_offset_minutes;
  if (offset == null) return [];

  // La relativa se calcula desde la principal, no desde `due_at`, para que
  // «diaria + 1 hora antes» avise antes de *cada* disparo.
  const primaries = primariesByEntry.get(entry.id);
  return primaries && primaries.length > 0
    ? relativeOccurrences(primaries, offset, now)
    : relativeFromDue(dueAt, offset, now);
}

/**
 * Reconcilia **todo**: cancela lo pendiente y reprograma la ventana entera.
 *
 * Es deliberadamente un recálculo completo y no un ajuste incremental. Con un
 * tope de 56 solicitudes cuesta poco, es idempotente, y hace que reponer tras
 * un cambio de zona horaria o de horario de verano no necesite código aparte.
 */
export async function reconcileAll(now: Date = new Date()): Promise<void> {
  const rules = await listActiveRules();
  if (rules.length === 0) {
    // Aun así puede quedar basura de reglas desactivadas hace un momento.
    await Notifications.cancelAllScheduledNotificationsAsync();
    return;
  }

  // De una vez, no una consulta por regla. Con un recordatorio suelto la
  // diferencia no se nota; con una serie de noventa lunes eran noventa idas y
  // vueltas a SQLite cada vez que la app vuelve a primer plano, que es algo
  // que ocurre constantemente.
  const entryIds = [...new Set(rules.map((rule) => rule.entry_id))];
  const entries = new Map<string, Entry>(
    (await getEntriesByIds(entryIds)).map((entry) => [entry.id, entry])
  );

  // Las principales primero: las relativas se calculan a partir de su serie.
  const rank = (rule: NotificationRule) => (rule.kind === 'primary' ? 0 : 1);
  const ordered = [...rules].sort((a, b) => rank(a) - rank(b));

  const primariesByEntry = new Map<string, Date[]>();
  const plans: RulePlan[] = [];
  for (const rule of ordered) {
    const entry = entries.get(rule.entry_id);
    if (!entry) continue;
    // Una tarea completada no vuelve a avisar.
    if (entry.completed) continue;
    plans.push({
      ruleId: rule.id,
      occurrences: occurrencesForRule(rule, entry, primariesByEntry, now),
    });
  }

  const allocated = new Map(
    allocateWindow(plans).map((p) => [p.ruleId, p.occurrences])
  );

  for (const rule of ordered) {
    await clearRule(rule.id);

    const entry = entries.get(rule.entry_id);
    const occurrences = allocated.get(rule.id) ?? [];
    if (!entry || occurrences.length === 0) {
      await setRuleNextTrigger(rule.id, null);
      continue;
    }

    for (const fireAt of occurrences) {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: contentFor(entry, rule),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireAt,
          channelId: CHANNEL_ID,
        },
      });
      await recordScheduled(rule.id, notificationId, fireAt.toISOString());
    }

    await setRuleNextTrigger(rule.id, occurrences[0].toISOString());
  }
}

/**
 * Al borrar un Entry o completar su tarea: cancelar lo suyo antes de nada.
 * No espera a la reconciliación para que el usuario no reciba un aviso de algo
 * que acaba de tachar.
 */
export async function cancelForEntry(entryId: string): Promise<void> {
  const rules = await listRules(entryId);
  await Promise.all(rules.map((rule) => clearRule(rule.id)));
  await Promise.all(rules.map((rule) => setRuleNextTrigger(rule.id, null)));
}
