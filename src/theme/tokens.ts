/**
 * Nocturne — tokens portados desde el `styles.css` del paquete de diseño
 * (`design_handoff_trazo/_ds/nocturne-<id>/styles.css`).
 *
 * Esta es la única fuente de color, tamaño, radio y sombra de la app.
 * No añadas valores nuevos aquí sin que existan en el sistema de diseño.
 */

export const color = {
  bg: '#161826',
  surface: '#232532',
  text: '#e9e9ed',
  accent: '#9184d9',
  /** `color-mix(in srgb, #e9e9ed 16%, transparent)` resuelto a rgba. */
  divider: 'rgba(233,233,237,0.16)',

  neutral: {
    100: '#f3f5fe',
    200: '#e4e7f5',
    300: '#cfd3e5',
    400: '#b2b6ca',
    500: '#9397ab',
    600: '#75798c',
    700: '#595d6c',
    800: '#3f424d',
    900: '#292b31',
  },

  accentRamp: {
    100: '#f5f4ff',
    200: '#e7e5fe',
    300: '#d2cefd',
    400: '#b5abfc',
    500: '#968ae0',
    600: '#796cbf',
    700: '#5d5294',
    800: '#423a6a',
    900: '#2b2741',
  },
} as const;

/**
 * Paleta de etiquetas, ampliada.
 *
 * Los seis primeros son los tonales originales de Nocturne, así que las
 * etiquetas ya existentes conservan su color exacto. Los diez siguientes
 * abren la gama a otras familias — azul, verde, ámbar, rosa — pero **con la
 * misma saturación baja**: la regla del sistema es que fuera del acento el
 * color no grita, y seis colores chillones convertirían la lista en un
 * semáforo. Todos rondan la luminosidad de la rampa neutral para que ninguno
 * pese más que otro sobre el fondo oscuro.
 */
export const TAG_PALETTE = [
  // Los seis originales.
  '#b5abfc',
  '#968ae0',
  '#9690c9',
  '#9397ab',
  '#7972a9',
  '#b2b6ca',
  // Ampliación, misma familia de saturación.
  '#8fa8d8',
  '#7d9bbf',
  '#8fbfb5',
  '#7aab9c',
  '#a8bf8f',
  '#c4b98a',
  '#d1a98a',
  '#c99a9a',
  '#c78fa8',
  '#a88fbf',
] as const;

/** Prioridad de tarea: color, nunca texto. Punto de 7px con borde de 1.5px. */
export const priorityDot = {
  high: { fill: color.accentRamp[400], border: color.accentRamp[400] },
  medium: { fill: 'transparent', border: color.accentRamp[600] },
  low: { fill: 'transparent', border: color.neutral[700] },
} as const;

/** Escala con densidad 0.70x ya incorporada. */
export const space = {
  1: 2.8,
  2: 5.6,
  3: 8.4,
  4: 11.2,
  6: 16.8,
  8: 22.4,
} as const;

/** Ritmo de layout de pantalla, distinto de la escala de espaciado. */
export const layout = {
  screenPadding: 18,
  rowPadding: 12,
  rowGap: 6,
  groupGap: 18,
  sectionMarginTop: 22,
  /** Ningún área táctil baja de esto. Regla de accesibilidad del sistema. */
  minTouch: 44,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 14,
} as const;

/**
 * `--shadow-sm` es `0 0 0 1px #3f424d`: un anillo, no una sombra.
 * En React Native se porta como borde real, no como boxShadow.
 */
export const ring = {
  sm: { borderWidth: 1, borderColor: color.neutral[800] },
  md: { borderWidth: 1, borderColor: color.neutral[700] },
  lg: { borderWidth: 1, borderColor: color.neutral[500] },
} as const;

/** La parte difusa de --shadow-md / --shadow-lg (RN 0.76+ soporta boxShadow). */
export const shadow = {
  md: '0px 6px 18px rgba(0,0,0,0.55)',
  lg: '0px 16px 40px rgba(0,0,0,0.65)',
  /** Tarjeta de captura al guardar, 420ms. */
  captureFlash: '0px 10px 30px rgba(145,132,217,0.18)',
  /** Tarjeta de preview y toast. */
  accentLift: '0px 12px 30px rgba(0,0,0,0.5)',
} as const;

export const font = {
  regular: 'Inter_400Regular',
  /** Peso 500 es el máximo del sistema. La jerarquía es tamaño y espacio. */
  medium: 'Inter_500Medium',
} as const;

/**
 * Roles tipográficos del handoff. `letterSpacing` en RN es absoluto (px),
 * no relativo como el `em` de CSS, así que va premultiplicado por el tamaño.
 */
export const type = {
  onboardingTitle: { fontFamily: font.medium, fontSize: 38, lineHeight: 40, letterSpacing: -1.14 },
  greeting: { fontFamily: font.medium, fontSize: 24, letterSpacing: -0.48 },
  screenTitle: { fontFamily: font.medium, fontSize: 24, letterSpacing: -0.48 },
  noteTitle: { fontFamily: font.medium, fontSize: 22, lineHeight: 29.7, letterSpacing: -0.22 },
  preview: { fontFamily: font.medium, fontSize: 19, lineHeight: 23.75, letterSpacing: -0.19 },
  captureInput: { fontFamily: font.regular, fontSize: 17, lineHeight: 23.8 },
  row: { fontFamily: font.regular, fontSize: 15, lineHeight: 21.75 },
  body: { fontFamily: font.regular, fontSize: 14, lineHeight: 21 },
  secondary: { fontFamily: font.regular, fontSize: 13, lineHeight: 19.5 },
  meta: { fontFamily: font.regular, fontSize: 11 },
  kicker: {
    fontFamily: font.regular,
    fontSize: 11,
    letterSpacing: 1.54,
    textTransform: 'uppercase' as const,
  },
  tabLabel: { fontFamily: font.regular, fontSize: 10, letterSpacing: 0.4 },
} as const;

/** Duraciones y curvas de los momentos de deleite (§7.2). */
export const motion = {
  /** cubic-bezier(.2,.8,.2,1) — la curva del sistema. */
  ease: [0.2, 0.8, 0.2, 1] as const,
  detectChip: 200,
  rowEnter: 340,
  enterBgFade: 500,
  enterClear: 900,
  captureFlash: 420,
  strike: 260,
  strikeText: 220,
  checkbox: 200,
  subtaskStrike: 240,
  breathe: 4000,
  sheetRise: 260,
  toastRise: 240,
  toastDismiss: 2600,
  tabColor: 180,
  tagRow: 180,
  spin: 900,
} as const;

/** Pull-to-refresh (§7.2, momento 6). */
export const pull = {
  resistance: 0.45,
  max: 84,
  threshold: 46,
  settled: 44,
} as const;
