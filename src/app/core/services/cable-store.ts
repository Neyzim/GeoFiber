import { Injectable, computed, effect, signal } from '@angular/core';
import { CABLES_STORAGE_KEY } from '../constants/map.constants';
import {
  Cable,
  CableDraft,
  CableStatus,
  CableType,
  cableTypeDefinition,
  createCable,
  isCableType,
} from '../models/cable.model';
import { GeoPoint, isValidLatitude, isValidLongitude } from '../models/geo.model';
import { isPinStatus } from '../models/pin.model';

/**
 * Fonte única de verdade dos cabos do projeto.
 *
 * Cada cabo guarda os seus próprios vértices (`points`), independentes dos
 * PINs: mover ou remover um elemento não altera o traçado. Segue o mesmo
 * padrão do `PinStoreService`: signals + persistência em `localStorage`.
 */
@Injectable({ providedIn: 'root' })
export class CableStoreService {
  private readonly _cables = signal<readonly Cable[]>(restoreCables());
  private readonly _selectedId = signal<string | null>(null);
  private readonly _search = signal('');
  private readonly _statusFilter = signal<ReadonlySet<CableStatus>>(new Set());
  private readonly _hiddenTypes = signal<ReadonlySet<CableType>>(new Set());

  /** Todos os cabos cadastrados. */
  readonly cables = this._cables.asReadonly();
  /** Id do cabo selecionado. */
  readonly selectedId = this._selectedId.asReadonly();
  /** Cabo selecionado (ou `null`). */
  readonly selectedCable = computed<Cable | null>(
    () => this._cables().find((cable) => cable.id === this._selectedId()) ?? null,
  );
  /** Termo de busca aplicado à lista. */
  readonly search = this._search.asReadonly();
  /** Situações atualmente filtradas (vazio = todas). */
  readonly statusFilter = this._statusFilter.asReadonly();
  /** Tipos ocultos no mapa e na lista. */
  readonly hiddenTypes = this._hiddenTypes.asReadonly();

  readonly total = computed(() => this._cables().length);

  /** Quantidade de cabos por tipo. */
  readonly typeCounts = computed<ReadonlyMap<CableType, number>>(() => {
    const counts = new Map<CableType, number>();
    for (const cable of this._cables()) {
      counts.set(cable.type, (counts.get(cable.type) ?? 0) + 1);
    }
    return counts;
  });

  /** Cabos que passam pelos filtros e pela busca — é o que vai para o mapa. */
  readonly visibleCables = computed<readonly Cable[]>(() => {
    const term = this._search().trim().toLowerCase();
    const statuses = this._statusFilter();
    const hidden = this._hiddenTypes();

    return this._cables().filter((cable) => {
      if (hidden.has(cable.type)) {
        return false;
      }
      if (statuses.size > 0 && !statuses.has(cable.status)) {
        return false;
      }
      if (!term) {
        return true;
      }
      const haystack = `${cable.name} ${cable.description} ${cable.tags.join(' ')}`.toLowerCase();
      return haystack.includes(term);
    });
  });

  readonly hiddenCount = computed(() => this._cables().length - this.visibleCables().length);

  readonly hasActiveFilters = computed(
    () =>
      this._search().trim().length > 0 ||
      this._statusFilter().size > 0 ||
      this._hiddenTypes().size > 0,
  );

  constructor() {
    effect(() => {
      const cables = this._cables();
      try {
        localStorage.setItem(CABLES_STORAGE_KEY, JSON.stringify(cables));
      } catch {
        // Armazenamento indisponível (modo privado/cota): segue apenas em memória.
      }
    });
  }

  /** Adiciona um cabo e o seleciona. */
  add(draft: CableDraft): Cable {
    const cable = createCable(draft);
    this._cables.update((cables) => [...cables, cable]);
    this._selectedId.set(cable.id);
    return cable;
  }

  update(id: string, changes: Partial<CableDraft>): void {
    this._cables.update((cables) =>
      cables.map((cable) =>
        cable.id === id ? { ...cable, ...changes, updatedAt: new Date().toISOString() } : cable,
      ),
    );
  }

  remove(id: string): void {
    this._cables.update((cables) => cables.filter((cable) => cable.id !== id));
    if (this._selectedId() === id) {
      this._selectedId.set(null);
    }
  }

  clearAll(): void {
    this._cables.set([]);
    this._selectedId.set(null);
  }

  select(id: string | null): void {
    this._selectedId.set(id);
  }

  findById(id: string): Cable | null {
    return this._cables().find((cable) => cable.id === id) ?? null;
  }

  setSearch(term: string): void {
    this._search.set(term);
  }

  setStatusFilter(statuses: readonly CableStatus[]): void {
    this._statusFilter.set(new Set(statuses));
  }

  toggleTypeVisibility(type: CableType): void {
    this._hiddenTypes.update((current) => toggleValue(current, type));
  }

  resetFilters(): void {
    this._search.set('');
    this._statusFilter.set(new Set());
    this._hiddenTypes.set(new Set());
  }

  /** Próximo nome livre para o tipo informado (ex.: `BB-03`). */
  suggestName(type: CableType): string {
    const definition = cableTypeDefinition(type);
    const sequence = this._cables().filter((cable) => cable.type === type).length + 1;
    return `${definition.code}-${String(sequence).padStart(2, '0')}`;
  }
}

function toggleValue<T>(current: ReadonlySet<T>, value: T): ReadonlySet<T> {
  const next = new Set(current);
  if (!next.delete(value)) {
    next.add(value);
  }
  return next;
}

/** Lê e valida os cabos persistidos; entradas inválidas são descartadas. */
function restoreCables(): readonly Cable[] {
  try {
    const raw = localStorage.getItem(CABLES_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter(isCableLike)
      .map(normalizeCable)
      .filter((cable) => cable.points.length >= 2);
  } catch {
    return [];
  }
}

type CableLike = Omit<Cable, 'type' | 'status'> & { type: CableType; status: CableStatus };

function isCableLike(value: unknown): value is CableLike {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<Cable>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    isCableType(candidate.type) &&
    isPinStatus(candidate.status) &&
    Array.isArray(candidate.points) &&
    candidate.points.every(isGeoPoint)
  );
}

function isGeoPoint(value: unknown): value is GeoPoint {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const point = value as Partial<GeoPoint>;
  return (
    typeof point.lat === 'number' &&
    typeof point.lng === 'number' &&
    isValidLatitude(point.lat) &&
    isValidLongitude(point.lng)
  );
}

function normalizeCable(cable: CableLike): Cable {
  const now = new Date().toISOString();
  return {
    ...cable,
    description: typeof cable.description === 'string' ? cable.description : '',
    tags: Array.isArray(cable.tags) ? cable.tags.filter((tag) => typeof tag === 'string') : [],
    createdAt: typeof cable.createdAt === 'string' ? cable.createdAt : now,
    updatedAt: typeof cable.updatedAt === 'string' ? cable.updatedAt : now,
  };
}
