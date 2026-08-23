/**
 * Guardar recordatorios también en el calendario del teléfono.
 *
 * Es opcional y por recordatorio: el interruptor vive en el ReminderCreator y
 * el permiso se pide la primera vez que se activa, no al arrancar la app.
 *
 * OJO con la API: en SDK 57 los métodos `*Async` de expo-calendar están
 * deprecados y **lanzan en runtime**. Todo lo de aquí usa la API de clases.
 */

import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

/** Duración del evento. Un recordatorio es un instante, no un rango. */
const EVENT_MINUTES = 30;

export async function ensureCalendarPermission(): Promise<boolean> {
  const current = await Calendar.getCalendarPermissions();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;

  const asked = await Calendar.requestCalendarPermissions();
  return asked.granted;
}

/**
 * Un calendario en el que se pueda escribir.
 *
 * `getDefaultCalendarSync()` solo existe en iOS: Android no expone un
 * calendario por defecto del sistema, así que hay que elegir uno a mano
 * prefiriendo el primario de la cuenta.
 */
async function writableCalendar(): Promise<Calendar.ExpoCalendar | null> {
  if (Platform.OS === 'ios') {
    try {
      return Calendar.getDefaultCalendarSync();
    } catch {
      // Sin calendario por defecto se cae al mismo camino que Android.
    }
  }

  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const writable = calendars.filter((c) => c.allowsModifications);
  if (writable.length === 0) return null;

  return writable.find((c) => c.isPrimary) ?? writable[0];
}

export interface CalendarEventInput {
  title: string;
  notes: string;
  startsAt: Date;
}

/**
 * Crea el evento y devuelve su id, o `null` si no se pudo (sin permiso o sin
 * calendario escribible). Nunca lanza: que falle el calendario no puede
 * impedir que se guarde el recordatorio.
 */
export async function createEvent(input: CalendarEventInput): Promise<string | null> {
  try {
    const calendar = await writableCalendar();
    if (!calendar) return null;

    const event = await calendar.createEvent({
      title: input.title,
      notes: input.notes,
      startDate: input.startsAt,
      endDate: new Date(input.startsAt.getTime() + EVENT_MINUTES * 60_000),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    return event.id;
  } catch {
    return null;
  }
}

/** Actualiza el evento existente. Devuelve `false` si ya no existe. */
export async function updateEvent(
  eventId: string,
  input: CalendarEventInput
): Promise<boolean> {
  try {
    const event = await Calendar.ExpoCalendarEvent.get(eventId);
    await event.update({
      title: input.title,
      notes: input.notes,
      startDate: input.startsAt,
      endDate: new Date(input.startsAt.getTime() + EVENT_MINUTES * 60_000),
    });
    return true;
  } catch {
    // El usuario pudo borrarlo desde la app de calendario.
    return false;
  }
}

export async function deleteEvent(eventId: string): Promise<void> {
  try {
    const event = await Calendar.ExpoCalendarEvent.get(eventId);
    await event.delete();
  } catch {
    // Ya no estaba: no hay nada que hacer.
  }
}

export interface PhoneEvent {
  id: string;
  title: string;
  startsAt: Date;
  allDay: boolean;
}

/**
 * Los eventos que ya hay en el calendario del teléfono para un rango.
 *
 * Es solo lectura y tolerante a fallos: sin permiso devuelve una lista vacía
 * en vez de lanzar, para que la pantalla de calendario siga funcionando con
 * las entradas propias aunque el usuario nunca haya dado acceso.
 */
export async function listPhoneEvents(from: Date, to: Date): Promise<PhoneEvent[]> {
  try {
    const permission = await Calendar.getCalendarPermissions();
    if (!permission.granted) return [];

    const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
    if (calendars.length === 0) return [];

    const events = await Calendar.listEvents(calendars, from, to);

    return events.map((event) => ({
      id: event.id,
      title: event.title ?? 'Sin título',
      startsAt: new Date(event.startDate as string | number | Date),
      allDay: Boolean(event.allDay),
    }));
  } catch {
    return [];
  }
}
