import { GeoPoint } from './geo.model';

/** Tipos de elemento de uma rede FTTH (e um PIN genérico). */
export type PinType =
  | 'olt'
  | 'ceo'
  | 'cto'
  | 'splitter'
  | 'poste'
  | 'reserva'
  | 'cliente'
  | 'generico';

/** Situação operacional do elemento. */
export type PinStatus = 'planejado' | 'ativo' | 'inativo' | 'manutencao';

/** Variante de portas de uma CTO (divisor óptico). */
export type CtoVariant = '1x16' | '1x8';

/** Elemento posicionado no mapa (o "PIN"). */
export interface Pin {
  id: string;
  name: string;
  type: PinType;
  status: PinStatus;
  position: GeoPoint;
  /** Variante de portas, usada apenas quando `type === 'cto'`. */
  ctoVariant?: CtoVariant;
  description: string;
  /** Cor personalizada; quando ausente usa a cor padrão do tipo. */
  color?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/** Dados informados pelo usuário ao criar/editar um PIN. */
export type PinDraft = Omit<Pin, 'id' | 'createdAt' | 'updatedAt'>;

export interface PinTypeDefinition {
  type: PinType;
  /** Rótulo completo exibido em listas e formulários. */
  label: string;
  /** Código curto exibido dentro do marcador no mapa. */
  code: string;
  /** Nome do ícone Material Symbols. */
  icon: string;
  color: string;
  description: string;
}

export interface PinStatusDefinition {
  status: PinStatus;
  label: string;
  color: string;
  icon: string;
}

/** Catálogo de tipos de elemento da rede óptica. */
export const PIN_TYPES: readonly PinTypeDefinition[] = [
  {
    type: 'olt',
    label: 'OLT / Central',
    code: 'OLT',
    icon: 'dns',
    color: '#1e88e5',
    description: 'Equipamento óptico terminal da operadora.',
  },
  {
    type: 'ceo',
    label: 'CEO — Caixa de Emenda Óptica',
    code: 'CEO',
    icon: 'call_split',
    color: '#8e24aa',
    description: 'Caixa de emenda e derivação de cabos ópticos.',
  },
  {
    type: 'cto',
    label: 'CTO — Caixa de Terminação Óptica',
    code: 'CTO',
    icon: 'hub',
    color: '#fb8c00',
    description: 'Caixa de atendimento aos assinantes com divisores.',
  },
  {
    type: 'splitter',
    label: 'Splitter óptico',
    code: 'SPL',
    icon: 'account_tree',
    color: '#00897b',
    description: 'Divisor óptico passivo (1x2, 1x4, 1x8, 1x16...).',
  },
  {
    type: 'poste',
    label: 'Poste / Apoio',
    code: 'PST',
    icon: 'bolt',
    color: '#546e7a',
    description: 'Ponto de apoio aéreo para o lançamento de cabos.',
  },
  {
    type: 'reserva',
    label: 'Reserva técnica',
    code: 'RES',
    icon: 'inventory_2',
    color: '#6d4c41',
    description: 'Reserva técnica de cabo (sobra para manutenção).',
  },
  {
    type: 'cliente',
    label: 'Cliente / Assinante',
    code: 'CLI',
    icon: 'home',
    color: '#43a047',
    description: 'Ponto de atendimento do assinante.',
  },
  {
    type: 'generico',
    label: 'Ponto genérico',
    code: 'PIN',
    icon: 'place',
    color: '#5c6bc0',
    description: 'Marcador livre para anotações no mapa.',
  },
];

/** Catálogo de situações do elemento. */
export const PIN_STATUSES: readonly PinStatusDefinition[] = [
  { status: 'planejado', label: 'Planejado', color: '#fbc02d', icon: 'draw' },
  { status: 'ativo', label: 'Ativo', color: '#2e7d32', icon: 'check_circle' },
  { status: 'inativo', label: 'Inativo', color: '#9e9e9e', icon: 'pause_circle' },
  { status: 'manutencao', label: 'Manutenção', color: '#e53935', icon: 'build_circle' },
];

export interface CtoVariantDefinition {
  value: CtoVariant;
  label: string;
  description: string;
}

/** Variantes de portas oferecidas para as CTO. */
export const CTO_VARIANTS: readonly CtoVariantDefinition[] = [
  { value: '1x16', label: 'CTO 1x16', description: 'Divisor com 16 portas de atendimento.' },
  { value: '1x8', label: 'CTO 1x8', description: 'Divisor com 8 portas de atendimento.' },
];

export function isCtoVariant(value: unknown): value is CtoVariant {
  return CTO_VARIANTS.some((definition) => definition.value === value);
}

const FALLBACK_TYPE: PinTypeDefinition = PIN_TYPES[PIN_TYPES.length - 1];
const FALLBACK_STATUS: PinStatusDefinition = PIN_STATUSES[0];

export function pinTypeDefinition(type: PinType): PinTypeDefinition {
  return PIN_TYPES.find((definition) => definition.type === type) ?? FALLBACK_TYPE;
}

export function pinStatusDefinition(status: PinStatus): PinStatusDefinition {
  return PIN_STATUSES.find((definition) => definition.status === status) ?? FALLBACK_STATUS;
}

export function isPinType(value: unknown): value is PinType {
  return PIN_TYPES.some((definition) => definition.type === value);
}

export function isPinStatus(value: unknown): value is PinStatus {
  return PIN_STATUSES.some((definition) => definition.status === value);
}

/** Cor final do marcador, considerando a personalização do usuário. */
export function pinColor(pin: Pick<Pin, 'type' | 'color'>): string {
  return pin.color ?? pinTypeDefinition(pin.type).color;
}

/** Variante efetiva da CTO (a primeira do catálogo quando não informada); `null` nos demais tipos. */
export function ctoVariantOf(pin: Pick<Pin, 'type' | 'ctoVariant'>): CtoVariant | null {
  return pin.type === 'cto' ? (pin.ctoVariant ?? CTO_VARIANTS[0].value) : null;
}

/**
 * Chave do subgrupo do PIN na legenda (ex.: `cto:1x16`).
 * Retorna `null` para os tipos que não possuem variantes.
 */
export function pinSubgroupKey(pin: Pick<Pin, 'type' | 'ctoVariant'>): string | null {
  const variant = ctoVariantOf(pin);
  return variant === null ? null : `${pin.type}:${variant}`;
}

/** Rótulo do subgrupo de um PIN (ex.: `CTO 1x16`); `null` quando não há variante. */
export function pinSubgroupLabel(pin: Pick<Pin, 'type' | 'ctoVariant'>): string | null {
  const variant = ctoVariantOf(pin);
  if (variant === null) {
    return null;
  }
  return CTO_VARIANTS.find((definition) => definition.value === variant)?.label ?? variant;
}

export function createPinId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Cria um PIN completo a partir dos dados do formulário. */
export function createPin(draft: PinDraft): Pin {
  const now = new Date().toISOString();
  return { ...draft, id: createPinId(), createdAt: now, updatedAt: now };
}
