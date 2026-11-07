import { GeoPoint } from './geo.model';
import { PinStatus } from './pin.model';

/** Tipos de cabo da rede FTTH. */
export type CableType = 'backbone' | 'alimentacao' | 'distribuicao' | 'drop';

/** Situação operacional do cabo (mesmo domínio dos PINs). */
export type CableStatus = PinStatus;

/** Cabo óptico com traçado próprio sobre o mapa. */
export interface Cable {
  id: string;
  name: string;
  type: CableType;
  status: CableStatus;
  /** Vértices do traçado, na ordem do lançamento (mínimo 2). */
  points: GeoPoint[];
  description: string;
  /** Cor personalizada; quando ausente usa a cor padrão do tipo. */
  color?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/** Dados informados pelo usuário ao criar/editar um cabo. */
export type CableDraft = Omit<Cable, 'id' | 'createdAt' | 'updatedAt'>;

export interface CableTypeDefinition {
  type: CableType;
  label: string;
  /** Código curto exibido em listas e na legenda. */
  code: string;
  /** Nome do ícone Material Symbols. */
  icon: string;
  color: string;
  /** Espessura da linha no mapa. */
  weight: number;
  /** Padrão de tracejado SVG; ausente = linha contínua. */
  dashArray?: string;
  description: string;
}

/** Catálogo de tipos de cabo, do troncal ao ponto do assinante. */
export const CABLE_TYPES: readonly CableTypeDefinition[] = [
  {
    type: 'backbone',
    label: 'Backbone',
    code: 'BB',
    icon: 'linear_scale',
    color: '#3949ab',
    weight: 6,
    description: 'Cabo troncal entre a OLT e as caixas de emenda.',
  },
  {
    type: 'alimentacao',
    label: 'Alimentação',
    code: 'AL',
    icon: 'cable',
    color: '#e53935',
    weight: 5,
    description: 'Cabo de alimentação entre a CEO e as CTO.',
  },
  {
    type: 'distribuicao',
    label: 'Distribuição',
    code: 'DI',
    icon: 'alt_route',
    color: '#00897b',
    weight: 4,
    dashArray: '12 7',
    description: 'Cabo de distribuição entre CTO e postes de apoio.',
  },
  {
    type: 'drop',
    label: 'Drop',
    code: 'DR',
    icon: 'conversion_path',
    color: '#f9a825',
    weight: 3,
    dashArray: '2 7',
    description: 'Cabo de derivação até o ponto do assinante.',
  },
];

const FALLBACK_TYPE: CableTypeDefinition = CABLE_TYPES[0];

export function cableTypeDefinition(type: CableType): CableTypeDefinition {
  return CABLE_TYPES.find((definition) => definition.type === type) ?? FALLBACK_TYPE;
}

export function isCableType(value: unknown): value is CableType {
  return CABLE_TYPES.some((definition) => definition.type === value);
}

/** Cor final da linha, considerando a personalização do usuário. */
export function cableColor(cable: Pick<Cable, 'type' | 'color'>): string {
  return cable.color ?? cableTypeDefinition(cable.type).color;
}

export function createCableId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cable-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Cria um cabo completo a partir dos dados do formulário/desenho. */
export function createCable(draft: CableDraft): Cable {
  const now = new Date().toISOString();
  return { ...draft, id: createCableId(), createdAt: now, updatedAt: now };
}
