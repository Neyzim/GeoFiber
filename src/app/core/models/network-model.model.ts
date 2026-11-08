import { CableType, cableTypeDefinition } from './cable.model';
import { PinType } from './pin.model';

/**
 * Cadastro de modelos ("tipos") de elemento da rede.
 *
 * Cada modelo descreve os parâmetros usados na criação dos elementos no mapa
 * (cor, quantidade de fibras, portas da CTO, capacidade de emendas da CEO...).
 * Os elementos guardam apenas o `modelId`, de forma que renomear/recolorir um
 * modelo se reflete em todos os itens vinculados.
 */
export type NetworkModelKind = 'cabo' | 'cto' | 'ceo';

/** Divisores ópticos disponíveis para uma CTO. */
export type CtoPorts = '1x2' | '1x4' | '1x8' | '1x16';

export interface NetworkModel {
  id: string;
  kind: NetworkModelKind;
  /** Nome amigável (ex.: "CTO 1x8 residencial"). */
  name: string;
  /** Código curto exibido nos marcadores e listas (ex.: "CTO-08"). */
  code: string;
  color: string;
  description: string;
  /** Categoria do cabo — apenas quando `kind === 'cabo'`. */
  category?: CableType;
  /** Quantidade de fibras do cabo — apenas quando `kind === 'cabo'`. */
  fibers?: number;
  /** Espessura da linha no mapa — apenas quando `kind === 'cabo'`. */
  weight?: number;
  /** Padrão de tracejado SVG — apenas quando `kind === 'cabo'`. */
  dashArray?: string;
  /** Divisor óptico — apenas quando `kind === 'cto'`. */
  ports?: CtoPorts;
  /** Capacidade de emendas — apenas quando `kind === 'ceo'`. */
  splices?: number;
  createdAt: string;
  updatedAt: string;
}

/** Dados informados no formulário de cadastro de modelo. */
export type NetworkModelDraft = Omit<NetworkModel, 'id' | 'createdAt' | 'updatedAt'>;

export interface NetworkModelKindDefinition {
  kind: NetworkModelKind;
  label: string;
  icon: string;
  color: string;
  description: string;
  /** Tipo de elemento equivalente, quando o modelo vira um PIN. */
  pinType?: PinType;
}

/** Categorias de modelo que podem ser cadastradas. */
export const NETWORK_MODEL_KINDS: readonly NetworkModelKindDefinition[] = [
  {
    kind: 'cabo',
    label: 'Cabos',
    icon: 'cable',
    color: '#3949ab',
    description: 'Cabo óptico com categoria, quantidade de fibras, cor e espessura.',
  },
  {
    kind: 'cto',
    label: 'CTO',
    icon: 'hub',
    color: '#fb8c00',
    description: 'Caixa de terminação óptica com o divisor (1x2, 1x4, 1x8, 1x16).',
    pinType: 'cto',
  },
  {
    kind: 'ceo',
    label: 'CEO',
    icon: 'call_split',
    color: '#8e24aa',
    description: 'Caixa de emenda óptica com a capacidade de emendas.',
    pinType: 'ceo',
  },
];

/** Divisores oferecidos no cadastro de CTO. */
export const CTO_PORTS: readonly CtoPorts[] = ['1x2', '1x4', '1x8', '1x16'];

/** Quantidades de fibras oferecidas no cadastro de cabos. */
export const FIBER_OPTIONS: readonly number[] = [1, 2, 4, 6, 8, 12, 24, 36, 48, 72, 96, 144];

const KIND_FALLBACK: NetworkModelKindDefinition = NETWORK_MODEL_KINDS[0];

export function networkModelKindDefinition(kind: NetworkModelKind): NetworkModelKindDefinition {
  return NETWORK_MODEL_KINDS.find((definition) => definition.kind === kind) ?? KIND_FALLBACK;
}

export function isNetworkModelKind(value: unknown): value is NetworkModelKind {
  return NETWORK_MODEL_KINDS.some((definition) => definition.kind === value);
}

export function isCtoPorts(value: unknown): value is CtoPorts {
  return CTO_PORTS.some((ports) => ports === value);
}

/** Tipo de elemento (PIN) gerado pelo modelo; `null` para cabos. */
export function modelPinType(model: Pick<NetworkModel, 'kind'>): PinType | null {
  return networkModelKindDefinition(model.kind).pinType ?? null;
}

/** Cor final do elemento: personalizada > modelo > cor padrão do tipo. */
export function resolveElementColor(
  custom: string | undefined,
  model: NetworkModel | null | undefined,
  fallback: string,
): string {
  return custom || model?.color || fallback;
}

/** Resumo curto dos parâmetros do modelo, usado em listas e balões. */
export function networkModelSummary(model: NetworkModel): string {
  if (model.kind === 'cabo') {
    const category = model.category ? cableTypeDefinition(model.category).label : 'Cabo';
    return model.fibers ? `${category} · ${model.fibers} fibras` : category;
  }
  if (model.kind === 'cto') {
    return model.ports ? `Divisor ${model.ports}` : 'CTO';
  }
  return model.splices ? `${model.splices} emendas` : 'CEO';
}

export function createNetworkModelId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `model-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Cria um modelo completo a partir dos dados do formulário. */
export function createNetworkModel(draft: NetworkModelDraft): NetworkModel {
  const now = new Date().toISOString();
  return { ...draft, id: createNetworkModelId(), createdAt: now, updatedAt: now };
}

/**
 * Ids fixos dos modelos iniciais. São estáveis para permitir a migração dos
 * elementos antigos (que guardavam apenas a variante da CTO, sem `modelId`).
 */
export const SEED_MODEL_IDS = {
  cto1x16: 'seed-cto-1x16',
  cto1x8: 'seed-cto-1x8',
  cto1x4: 'seed-cto-1x4',
  ceo24: 'seed-ceo-24',
  ceo12: 'seed-ceo-12',
  cableBackbone24: 'seed-cable-backbone-24',
  cableAlimentacao12: 'seed-cable-alimentacao-12',
  cableDistribuicao12: 'seed-cable-distribuicao-12',
  cableDrop2: 'seed-cable-drop-2',
} as const;

/** Mapeia a antiga variante da CTO (`ctoVariant`) para o modelo equivalente. */
export const LEGACY_CTO_VARIANT_MODEL_IDS: Record<string, string> = {
  '1x16': SEED_MODEL_IDS.cto1x16,
  '1x8': SEED_MODEL_IDS.cto1x8,
  '1x4': SEED_MODEL_IDS.cto1x4,
};

const SEED_TIMESTAMP = '2026-01-01T00:00:00.000Z';

function seed(
  id: string,
  kind: NetworkModelKind,
  name: string,
  code: string,
  color: string,
  description: string,
  extra: Partial<NetworkModel> = {},
): NetworkModel {
  return {
    id,
    kind,
    name,
    code,
    color,
    description,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    ...extra,
  };
}

/** Modelos criados automaticamente no primeiro acesso ao sistema. */
export function seedNetworkModels(): NetworkModel[] {
  return [
    seed(SEED_MODEL_IDS.cto1x16, 'cto', 'CTO 1x16', 'CTO-16', '#fb8c00', 'Divisor de 16 portas de atendimento.', { ports: '1x16' }),
    seed(SEED_MODEL_IDS.cto1x8, 'cto', 'CTO 1x8', 'CTO-08', '#fb8c00', 'Divisor de 8 portas de atendimento.', { ports: '1x8' }),
    seed(SEED_MODEL_IDS.cto1x4, 'cto', 'CTO 1x4', 'CTO-04', '#fb8c00', 'Divisor de 4 portas de atendimento.', { ports: '1x4' }),
    seed(SEED_MODEL_IDS.ceo24, 'ceo', 'CEO 24 emendas', 'CEO-24', '#8e24aa', 'Caixa de emenda com 24 posições.', { splices: 24 }),
    seed(SEED_MODEL_IDS.ceo12, 'ceo', 'CEO 12 emendas', 'CEO-12', '#8e24aa', 'Caixa de emenda com 12 posições.', { splices: 12 }),
    seed(SEED_MODEL_IDS.cableBackbone24, 'cabo', 'Backbone 24 fibras', 'BB-24', '#3949ab', 'Cabo troncal entre a OLT e as caixas de emenda.', { category: 'backbone', fibers: 24, weight: 6 }),
    seed(SEED_MODEL_IDS.cableAlimentacao12, 'cabo', 'Alimentação 12 fibras', 'AL-12', '#e53935', 'Cabo de alimentação entre a CEO e as CTO.', { category: 'alimentacao', fibers: 12, weight: 5 }),
    seed(SEED_MODEL_IDS.cableDistribuicao12, 'cabo', 'Distribuição 12 fibras', 'DI-12', '#00897b', 'Cabo de distribuição entre CTO e postes de apoio.', { category: 'distribuicao', fibers: 12, weight: 4, dashArray: '12 7' }),
    seed(SEED_MODEL_IDS.cableDrop2, 'cabo', 'Drop 2 fibras', 'DR-02', '#f9a825', 'Cabo de derivação até o ponto do assinante.', { category: 'drop', fibers: 2, weight: 3, dashArray: '2 7' }),
  ];
}
