/**
 * Identificadores locales. React Native no expone `crypto.randomUUID`, y en
 * fase 1 los datos no salen del dispositivo, así que basta con marca de tiempo
 * + aleatorio: ordenable y sin colisiones en un solo cliente. Si en fase 2
 * entra la sincronización con Supabase, sustituir por UUID v4 real.
 */
export function id(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
