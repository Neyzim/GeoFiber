import { Injectable, Signal, computed, effect, signal } from '@angular/core';
import { NETWORK_MODELS_STORAGE_KEY } from '../constants/map.constants';
import {
  NetworkModel,
  NetworkModelDraft,
  NetworkModelKind,
  createNetworkModel,
  normalizeModel,
  seedNetworkModels,
} from '../models/network-model.model';

/**
 * Atalhos de preenchimento (modelos) de cabo, CTO e CEO.
 *
 * Ficam só neste navegador (`localStorage`); a rede em si vem da API. Na primeira
 * execução a coleção é semeada com modelos básicos. Dados no formato antigo são
 * convertidos por `normalizeModel`.
 */
@Injectable({ providedIn: 'root' })
export class NetworkModelStoreService {
  private readonly _models = signal<readonly NetworkModel[]>(restoreModels());
  private readonly kindCache = new Map<NetworkModelKind, Signal<readonly NetworkModel[]>>();

  /** Todos os modelos cadastrados. */
  readonly models = this._models.asReadonly();
  readonly total = computed(() => this._models().length);

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

  /** Modelos de uma categoria, na ordem de cadastro. */
  byKind(kind: NetworkModelKind): Signal<readonly NetworkModel[]> {
    let cached = this.kindCache.get(kind);
    if (!cached) {
      cached = computed(() => this._models().filter((model) => model.kind === kind));
      this.kindCache.set(kind, cached);
    }
    return cached;
  }

  findById(id: string | null | undefined): NetworkModel | null {
    if (!id) {
      return null;
    }
    return this._models().find((model) => model.id === id) ?? null;
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
}

/** Lê e converte os modelos persistidos; entradas inválidas são descartadas. */
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
    return parsed
      .map(normalizeModel)
      .filter((model): model is NetworkModel => model !== null);
  } catch {
    return seedNetworkModels();
  }
}
