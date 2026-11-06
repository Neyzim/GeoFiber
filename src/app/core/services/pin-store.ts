import { Injectable, computed, effect, signal } from '@angular/core';
import { PINS_STORAGE_KEY } from '../constants/map.constants';
import { GeoPoint, isValidLatitude, isValidLongitude } from '../models/geo.model';
import {
  Pin,
  PinDraft,
  PinStatus,
  PinType,
  createPin,
  isPinStatus,
  isPinType,
  pinTypeDefinition,
} from '../models/pin.model';

/**
 * Fonte única de verdade dos PINs do projeto.
 *
 * Mantém a coleção em signals (compatível com change detection zoneless),
 * a seleção atual, o termo de busca e os filtros de visibilidade, além de
 * persistir tudo no `localStorage`.
 */
@Injectable({ providedIn: 'root' })
export class PinStoreService {
  private readonly _pins = signal<readonly Pin[]>(restorePins());
  private readonly _selectedId = signal<string | null>(null);
  private readonly _search = signal('');
  private readonly _statusFilter = signal<ReadonlySet<PinStatus>>(new Set());
  private readonly _hiddenTypes = signal<ReadonlySet<PinType>>(new Set());

  /** Todos os PINs cadastrados. */
  readonly pins = this._pins.asReadonly();
  /** Id do PIN selecionado. */
  readonly selectedId = this._selectedId.asReadonly();
  /** PIN selecionado (ou `null`). */
  readonly selectedPin = computed<Pin | null>(
    () => this._pins().find((pin) => pin.id === this._selectedId()) ?? null,
  );
  /** Termo de busca aplicado à lista. */
  readonly search = this._search.asReadonly();
  /** Situações atualmente filtradas (vazio = todas). */
  readonly statusFilter = this._statusFilter.asReadonly();
  /** Tipos ocultos no mapa e na lista. */
  readonly hiddenTypes = this._hiddenTypes.asReadonly();

  /** Quantidade total de PINs. */
  readonly total = computed(() => this._pins().length);

  /** Quantidade de PINs por tipo. */
  readonly typeCounts = computed<ReadonlyMap<PinType, number>>(() => {
    const counts = new Map<PinType, number>();
    for (const pin of this._pins()) {
      counts.set(pin.type, (counts.get(pin.type) ?? 0) + 1);
    }
    return counts;
  });

  /** PINs que passam pelos filtros e pela busca — é o que vai para o mapa. */
  readonly visiblePins = computed<readonly Pin[]>(() => {
    const term = this._search().trim().toLowerCase();
    const statuses = this._statusFilter();
    const hidden = this._hiddenTypes();

    return this._pins().filter((pin) => {
      if (hidden.has(pin.type)) {
        return false;
      }
      if (statuses.size > 0 && !statuses.has(pin.status)) {
        return false;
      }
      if (!term) {
        return true;
      }
      const haystack = `${pin.name} ${pin.description} ${pin.tags.join(' ')}`.toLowerCase();
      return haystack.includes(term);
    });
  });

  /** Nº de PINs escondidos por filtros/busca. */
  readonly hiddenCount = computed(() => this._pins().length - this.visiblePins().length);

  readonly hasActiveFilters = computed(
    () =>
      this._search().trim().length > 0 ||
      this._statusFilter().size > 0 ||
      this._hiddenTypes().size > 0,
  );

  constructor() {
    effect(() => {
      const pins = this._pins();
      try {
        localStorage.setItem(PINS_STORAGE_KEY, JSON.stringify(pins));
      } catch {
        // Armazenamento indisponível (modo privado/cota): segue apenas em memória.
      }
    });
  }

  /** Adiciona um PIN e o seleciona. */
  add(draft: PinDraft): Pin {
    const pin = createPin(draft);
    this._pins.update((pins) => [...pins, pin]);
    this._selectedId.set(pin.id);
    return pin;
  }

  /** Aplica alterações parciais em um PIN existente. */
  update(id: string, changes: Partial<PinDraft>): void {
    this._pins.update((pins) =>
      pins.map((pin) =>
        pin.id === id ? { ...pin, ...changes, updatedAt: new Date().toISOString() } : pin,
      ),
    );
  }

  /** Reposiciona um PIN (arrasto no mapa). */
  moveTo(id: string, position: GeoPoint): void {
    this.update(id, { position });
  }

  /** Remove um PIN. */
  remove(id: string): void {
    this._pins.update((pins) => pins.filter((pin) => pin.id !== id));
    if (this._selectedId() === id) {
      this._selectedId.set(null);
    }
  }

  /** Remove todos os PINs do projeto. */
  clearAll(): void {
    this._pins.set([]);
    this._selectedId.set(null);
  }

  select(id: string | null): void {
    this._selectedId.set(id);
  }

  findById(id: string): Pin | null {
    return this._pins().find((pin) => pin.id === id) ?? null;
  }

  setSearch(term: string): void {
    this._search.set(term);
  }

  /** Substitui o conjunto de situações filtradas (vazio = todas). */
  setStatusFilter(statuses: readonly PinStatus[]): void {
    this._statusFilter.set(new Set(statuses));
  }

  /** Mostra/oculta um tipo de elemento no mapa e na lista. */
  toggleTypeVisibility(type: PinType): void {
    this._hiddenTypes.update((current) => toggleValue(current, type));
  }

  resetFilters(): void {
    this._search.set('');
    this._statusFilter.set(new Set());
    this._hiddenTypes.set(new Set());
  }

  /** Próximo nome livre para o tipo informado (ex.: `CTO-03`). */
  suggestName(type: PinType): string {
    const definition = pinTypeDefinition(type);
    const sequence = this._pins().filter((pin) => pin.type === type).length + 1;
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

/** Lê e valida os PINs persistidos; entradas inválidas são descartadas. */
function restorePins(): readonly Pin[] {
  try {
    const raw = localStorage.getItem(PINS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isPinLike).map(normalizePin);
  } catch {
    return [];
  }
}

type PinLike = Omit<Pin, 'type' | 'status'> & { type: PinType; status: PinStatus };

function isPinLike(value: unknown): value is PinLike {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<Pin>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    isPinType(candidate.type) &&
    isPinStatus(candidate.status) &&
    typeof candidate.position === 'object' &&
    candidate.position !== null &&
    typeof candidate.position.lat === 'number' &&
    typeof candidate.position.lng === 'number' &&
    isValidLatitude(candidate.position.lat) &&
    isValidLongitude(candidate.position.lng)
  );
}

function normalizePin(pin: PinLike): Pin {
  const now = new Date().toISOString();
  return {
    ...pin,
    description: typeof pin.description === 'string' ? pin.description : '',
    tags: Array.isArray(pin.tags) ? pin.tags.filter((tag) => typeof tag === 'string') : [],
    createdAt: typeof pin.createdAt === 'string' ? pin.createdAt : now,
    updatedAt: typeof pin.updatedAt === 'string' ? pin.updatedAt : now,
  };
}
