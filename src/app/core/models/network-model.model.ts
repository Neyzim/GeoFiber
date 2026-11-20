import { CableRole } from '../api/api-types';
import { roleDefinition } from '../network/network-catalog';

/**
 * Modelos ("atalhos") de elemento da rede.
 *
 * Um modelo é só um atalho de preenchimento: ao criar uma CTO, CEO ou cabo, escolher
 * um modelo preenche fabricante, modelo e capacidades no formulário. O elemento salvo
 * na API não guarda vínculo com o modelo — editar um modelo não altera a rede.
 * Os modelos ficam apenas neste navegador (`localStorage`).
 */
export type NetworkModelKind = 'cabo' | 'cto' | 'ceo';

export interface NetworkModel {
  id: string;
  kind: NetworkModelKind;
  /** Nome amigável (ex.: "CTO 1x8 residencial"). */
  name: string;
  description: string;
  manufacturer?: string;
  model?: string;
  /** Portas de atendimento — apenas CTO. */
  powerCapacity?: number;
  /** Bandejas de emenda — apenas CEO. */
  trayCapacity?: number;
  /** Função do cabo — apenas cabo. */
  role?: CableRole;
  /** Quantidade de fibras — apenas cabo. */
  fiberCapacity?: number;
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
}

/** Categorias de modelo que podem ser cadastradas. */
export const NETWORK_MODEL_KINDS: readonly NetworkModelKindDefinition[] = [
  {
    kind: 'cabo',
    label: 'Cabos',
    icon: 'cable',
    color: '#3949ab',
    description: 'Função do cabo e quantidade de fibras.',
  },
  {
    kind: 'cto',
    label: 'CTO',
    icon: 'hub',
    color: '#fb8c00',
    description: 'Caixa de atendimento: quantas portas atendem clientes.',
  },
  {
    kind: 'ceo',
    label: 'CEO',
    icon: 'call_split',
    color: '#8e24aa',
    description: 'Caixa de emenda: quantas bandejas de emenda.',
  },
];

/** Quantidades de fibras oferecidas no cadastro de cabos. */
export const FIBER_OPTIONS: readonly number[] = [1, 2, 4, 6, 8, 12, 24, 36, 48, 72, 96, 144];

const KIND_FALLBACK: NetworkModelKindDefinition = NETWORK_MODEL_KINDS[0];

export function networkModelKindDefinition(kind: NetworkModelKind): NetworkModelKindDefinition {
  return NETWORK_MODEL_KINDS.find((definition) => definition.kind === kind) ?? KIND_FALLBACK;
}

export function isNetworkModelKind(value: unknown): value is NetworkModelKind {
  return NETWORK_MODEL_KINDS.some((definition) => definition.kind === value);
}

/** Resumo curto dos parâmetros do modelo, em linguagem simples. */
export function networkModelSummary(model: NetworkModel): string {
  if (model.kind === 'cabo') {
    const role = model.role ? roleDefinition(model.role).label : 'Cabo';
    return model.fiberCapacity ? `${role} · ${model.fiberCapacity} fibras` : role;
  }
  if (model.kind === 'cto') {
    return model.powerCapacity ? `${model.powerCapacity} portas de atendimento` : 'CTO';
  }
  return model.trayCapacity ? `${model.trayCapacity} bandejas` : 'CEO';
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

const LEGACY_CATEGORY_ROLES: Readonly<Record<string, CableRole>> = {
  backbone: 'BACKBONE',
  alimentacao: 'FEEDER',
  distribuicao: 'DISTRIBUTION',
  drop: 'DROP',
};

const CABLE_ROLES: readonly CableRole[] = [
  'BACKBONE',
  'FEEDER',
  'DISTRIBUTION',
  'DROP',
  'INTERCONNECTION',
];

function positiveInt(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

/** Lê o divisor antigo da CTO (`'1x8'` → `8`). */
function legacyPorts(value: unknown): number | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const match = /^1x(\d+)$/.exec(value);
  return match ? positiveInt(Number.parseInt(match[1], 10)) : undefined;
}

/**
 * Valida um modelo lido do armazenamento e converte o formato antigo
 * (`ports`, `fibers`, `category`; `code`, `color`, `weight`, `dashArray` e `splices`
 * são descartados). Retorna `null` para entradas inválidas.
 */
export function normalizeModel(raw: unknown): NetworkModel | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const value = raw as Record<string, unknown>;
  const id = text(value['id']);
  const name = text(value['name']);
  const kind = value['kind'];
  if (!id || !name || !isNetworkModelKind(kind)) {
    return null;
  }

  const now = new Date().toISOString();
  const model: NetworkModel = {
    id,
    kind,
    name,
    description: typeof value['description'] === 'string' ? value['description'] : '',
    createdAt: text(value['createdAt']) ?? now,
    updatedAt: text(value['updatedAt']) ?? now,
  };
  const manufacturer = text(value['manufacturer']);
  const modelName = text(value['model']);
  if (manufacturer) model.manufacturer = manufacturer;
  if (modelName) model.model = modelName;

  if (kind === 'cto') {
    const ports = positiveInt(value['powerCapacity']) ?? legacyPorts(value['ports']);
    if (ports) model.powerCapacity = ports;
  } else if (kind === 'ceo') {
    const trays = positiveInt(value['trayCapacity']);
    if (trays) model.trayCapacity = trays;
  } else {
    const rawRole = value['role'];
    const role = CABLE_ROLES.includes(rawRole as CableRole)
      ? (rawRole as CableRole)
      : LEGACY_CATEGORY_ROLES[String(value['category'])];
    const fibers = positiveInt(value['fiberCapacity']) ?? positiveInt(value['fibers']);
    if (role) model.role = role;
    if (fibers) model.fiberCapacity = fibers;
  }
  return model;
}

/** Ids fixos dos modelos iniciais (permitem "Restaurar padrões" sem duplicar). */
export const SEED_MODEL_IDS = {
  cto1x16: 'seed-cto-1x16',
  cto1x8: 'seed-cto-1x8',
  cto1x4: 'seed-cto-1x4',
  ceo2: 'seed-ceo-2-bandejas',
  ceo4: 'seed-ceo-4-bandejas',
  cableBackbone24: 'seed-cable-backbone-24',
  cableAlimentacao12: 'seed-cable-alimentacao-12',
  cableDistribuicao12: 'seed-cable-distribuicao-12',
  cableDrop2: 'seed-cable-drop-2',
} as const;

const SEED_TIMESTAMP = '2026-01-01T00:00:00.000Z';

function seed(
  id: string,
  kind: NetworkModelKind,
  name: string,
  description: string,
  extra: Partial<NetworkModel>,
): NetworkModel {
  return {
    id,
    kind,
    name,
    description,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    ...extra,
  };
}

/** Modelos criados automaticamente no primeiro acesso ao sistema. */
export function seedNetworkModels(): NetworkModel[] {
  return [
    seed(SEED_MODEL_IDS.cto1x16, 'cto', 'CTO 1x16', 'Atende até 16 clientes.', { powerCapacity: 16 }),
    seed(SEED_MODEL_IDS.cto1x8, 'cto', 'CTO 1x8', 'Atende até 8 clientes.', { powerCapacity: 8 }),
    seed(SEED_MODEL_IDS.cto1x4, 'cto', 'CTO 1x4', 'Atende até 4 clientes.', { powerCapacity: 4 }),
    seed(SEED_MODEL_IDS.ceo2, 'ceo', 'CEO 2 bandejas', 'Caixa de emenda pequena.', { trayCapacity: 2 }),
    seed(SEED_MODEL_IDS.ceo4, 'ceo', 'CEO 4 bandejas', 'Caixa de emenda média.', { trayCapacity: 4 }),
    seed(SEED_MODEL_IDS.cableBackbone24, 'cabo', 'Backbone 24 fibras', 'Cabo troncal que sai da OLT.', { role: 'BACKBONE', fiberCapacity: 24 }),
    seed(SEED_MODEL_IDS.cableAlimentacao12, 'cabo', 'Alimentação 12 fibras', 'Leva o sinal até as caixas de emenda.', { role: 'FEEDER', fiberCapacity: 12 }),
    seed(SEED_MODEL_IDS.cableDistribuicao12, 'cabo', 'Distribuição 12 fibras', 'Distribui o sinal entre as caixas de atendimento.', { role: 'DISTRIBUTION', fiberCapacity: 12 }),
    seed(SEED_MODEL_IDS.cableDrop2, 'cabo', 'Drop 2 fibras', 'Liga a caixa de atendimento ao cliente.', { role: 'DROP', fiberCapacity: 2 }),
  ];
}
