import { Injectable, computed, effect, signal } from '@angular/core';
import { NETWORK_MODELS_STORAGE_KEY } from '../constants/map.constants';
import { CableType, cableTypeDefinition } from '../models/cable.model';
import {
  CtoPorts,
  NetworkModel,
  NetworkModelDraft,
  NetworkModelKind,
  createNetworkModel,
  isCtoPorts,
  isNetworkModelKind,
  networkModelKindDefinition,
  seedNetworkModels,
} from '../models/network-model.model';
import { PinType } from '../models/pin.model';

/**
 * Fonte única de verdade dos modelos (tipos) de cabo, CTO e CEO.
 *
 * Segue o mesmo padrão dos demais stores: signals + persistência em
 * `localStorage`. Na primeira execução a coleção é semeada com modelos
 * básicos, para que a criação no mapa funcione de imediato.
 */
@Injectable({ providedIn: 'root' })
export class NetworkModelStoreService {
  private readonly _models = signal<readonly NetworkModel[]>(restoreModels());

  /** Todos os modelos cadastrados. */
  readonly models = this._models.asReadonly();
  readonly total = computed(() => this._models().length);

  /** Modelos agrupados por categoria (cabo/CTO/CEO). */
  readonly byKind = computed<ReadonlyMap<NetworkModelKind, readonly NetworkModel[]>>(() => {
    const groups = new Map<NetworkModelKind, NetworkModel[]>();
    for (const model of this._models()) {
      const bucket = groups.get(model.kind) ?? [];
      bucket.push(model);
      groups.set(model.kind, bucket);
    }
    return groups;
  });

  /** Modelos de cabo, na ordem de cadastro. */
  readonly cableModels = computed<readonly NetworkModel[]>(
    () => this.byKind().get('cabo') ?? [],
  );

  /** Modelos que geram PINs (CTO e CEO). */
  readonly pinModels = computed<readonly NetworkModel[]>(() => [
    ...(this.byKind().get('cto') ?? []),
    ...(this.byKind().get('ceo') ?? []),
  ]);

  constructor() {
    effect(() => {
      const models = this._models();
      try {
        localStorage.setItem(NETWORK_MODELS_STORAGE_KEY, JSON.stringify(models));
      } catch {
        // Armazenamento indisponível (modo privado/cota): segue apenas em memória.
      }
    });
  }

  findById(id: string | null | undefined): NetworkModel | null {
    if (!id) {
      return null;
    }
    return this._models().find((model) => model.id === id) ?? null;
  }

  modelsOfKind(kind: NetworkModelKind): readonly NetworkModel[] {
    return this.byKind().get(kind) ?? [];
  }

  /** Modelos que geram um PIN do tipo informado (CTO/CEO). */
  modelsForPinType(type: PinType): readonly NetworkModel[] {
    return this.pinModels().filter((model) => networkModelKindDefinition(model.kind).pinType === type);
  }

  /** Modelos de cabo da categoria informada. */
  modelsForCableType(type: CableType): readonly NetworkModel[] {
    return this.cableModels().filter((model) => model.category === type);
  }

  add(draft: NetworkModelDraft): NetworkModel {
    const model = createNetworkModel(draft);
    this._models.update((models) => [...models, model]);
    return model;
  }

  update(id: string, changes: Partial<NetworkModelDraft>): void {
    this._models.update((models) =>
      models.map((model) =>
        model.id === id ? { ...model, ...changes, updatedAt: new Date().toISOString() } : model,
      ),
    );
  }

  remove(id: string): void {
    this._models.update((models) => models.filter((model) => model.id !== id));
  }

  /** Restaura a coleção semeada, mantendo os modelos personalizados. */
  restoreDefaults(): void {
    const existing = new Set(this._models().map((model) => model.id));
    const missing = seedNetworkModels().filter((model) => !existing.has(model.id));
    this._models.update((models) => [...models, ...missing]);
  }

  /**
   * Sugere um código curto para o modelo, derivado dos seus parâmetros
   * (ex.: `BB-24`, `CTO-08`, `CEO-24`), garantindo que seja único.
   */
  suggestCode(kind: NetworkModelKind, model: Partial<NetworkModel>): string {
    let base: string;
    if (kind === 'cabo') {
      const prefix = model.category ? cableTypeDefinition(model.category).code : 'CB';
      base = `${prefix}-${String(model.fibers ?? 1).padStart(2, '0')}`;
    } else if (kind === 'cto') {
      base = `CTO-${String(portsSuffix(model.ports)).padStart(2, '0')}`;
    } else {
      base = `CEO-${model.splices ?? 12}`;
    }
    return this.uniqueCode(base);
  }

  private uniqueCode(base: string): string {
    const taken = new Set(this._models().map((model) => model.code.toUpperCase()));
    if (!taken.has(base.toUpperCase())) {
      return base;
    }
    let sequence = 2;
    while (taken.has(`${base}-${sequence}`.toUpperCase())) {
      sequence += 1;
    }
    return `${base}-${sequence}`;
  }
}

/** Extrai o número de portas de um divisor (`1x8` → `8`). */
function portsSuffix(ports: CtoPorts | undefined): number {
  const value = Number.parseInt((ports ?? '1x16').split('x')[1] ?? '16', 10);
  return Number.isFinite(value) ? value : 16;
}

/** Lê e valida os modelos persistidos; entradas inválidas são descartadas. */
function restoreModels(): readonly NetworkModel[] {
  try {
    const raw = localStorage.getItem(NETWORK_MODELS_STORAGE_KEY);
    if (!raw) {
      return seedNetworkModels();
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return seedNetworkModels();
    }
    return parsed.filter(isNetworkModelLike).map(normalizeModel);
  } catch {
    return seedNetworkModels();
  }
}

type NetworkModelLike = Omit<NetworkModel, 'kind'> & { kind: NetworkModelKind };

function isNetworkModelLike(value: unknown): value is NetworkModelLike {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<NetworkModel>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.code === 'string' &&
    isNetworkModelKind(candidate.kind)
  );
}

function normalizeModel(model: NetworkModelLike): NetworkModel {
  const now = new Date().toISOString();
  return {
    ...model,
    color: typeof model.color === 'string' ? model.color : '#5c6bc0',
    description: typeof model.description === 'string' ? model.description : '',
    fibers: typeof model.fibers === 'number' ? model.fibers : undefined,
    weight: typeof model.weight === 'number' ? model.weight : undefined,
    dashArray: typeof model.dashArray === 'string' ? model.dashArray : undefined,
    ports: isCtoPorts(model.ports) ? model.ports : undefined,
    splices: typeof model.splices === 'number' ? model.splices : undefined,
    createdAt: typeof model.createdAt === 'string' ? model.createdAt : now,
    updatedAt: typeof model.updatedAt === 'string' ? model.updatedAt : now,
  };
}
