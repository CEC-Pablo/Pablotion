/**
 * Phosphor, peso regular siempre (regla del sistema de diseño).
 *
 * El mapa traduce los nombres kebab-case del handoff a los componentes
 * PascalCase del paquete, para que el código de pantalla se lea igual que la
 * especificación.
 */

import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  BellRinging,
  CaretDown,
  CaretLeft,
  CaretRight,
  Check,
  CheckCircle,
  CheckSquareOffset,
  Clock,
  ClockCounterClockwise,
  GearSix,
  House,
  Info,
  MagnifyingGlass,
  Minus,
  Note,
  PencilSimple,
  Plus,
  Sparkle,
  Tag,
  Trash,
  Wind,
  X,
} from 'phosphor-react-native';

import { color as tokens } from '../theme/tokens';

const ICONS = {
  house: House,
  'check-square-offset': CheckSquareOffset,
  'magnifying-glass': MagnifyingGlass,
  tag: Tag,
  'gear-six': GearSix,
  'arrow-up': ArrowUp,
  'arrow-right': ArrowRight,
  'arrow-left': ArrowLeft,
  'caret-left': CaretLeft,
  'caret-right': CaretRight,
  'caret-down': CaretDown,
  bell: Bell,
  'bell-ringing': BellRinging,
  note: Note,
  check: Check,
  x: X,
  clock: Clock,
  'clock-counter-clockwise': ClockCounterClockwise,
  sparkle: Sparkle,
  trash: Trash,
  'pencil-simple': PencilSimple,
  plus: Plus,
  minus: Minus,
  wind: Wind,
  'check-circle': CheckCircle,
  info: Info,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 18,
  color = tokens.text,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const Component = ICONS[name];
  return <Component size={size} color={color} weight="regular" />;
}

/** Mapa tipo → icono del handoff. */
export const TYPE_ICON = {
  note: 'note',
  task: 'check-square-offset',
  reminder: 'bell',
} as const satisfies Record<string, IconName>;
