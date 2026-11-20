import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { CableRole, InfrastructureStatus } from '../api/api-types';
import { MapCable, MapElement } from './map-element';
import { NetworkMapRepository } from './network-map-repository';
import { ElementGroup } from './network-catalog';

export type Selection = { type: 'element'; key: string } | { type: 'cable'; id: string } | null;

/** Chave de grupo ocultável na legenda: grupo de elemento ou função de cabo. */
export type LegendGroupKey = ElementGroup | CableRole;

/**
 * Estado da tela do mapa (não guarda dados de rede): permissão de edição, seleção,
 * busca, filtro de situação e grupos ocultos.
 */
@Injectable({ providedIn: 'root' })
export class NetworkMapState {
  private readonly repository = inject(NetworkMapRepository);

  /** Ferramentas de edição liberadas. Sempre `true` até existir autenticação. */
  readonly canEdit = signal(true);

  private readonly _selection = signal<Selection>(null);
  private readonly _search = signal('');
  private readonly _statusFilter = signal<ReadonlySet<InfrastructureStatus>>(new Set());
  private readonly _hiddenGroups = signal<ReadonlySet<LegendGroupKey>>(new Set());

  readonly selection = this._selection.asReadonly();
  readonly search = this._search.asReadonly();
  readonly statusFilter = this._statusFilter.asReadonly();
  readonly hiddenGroups = this._hiddenGroups.asReadonly();

  readonly selectedElement = computed<MapElement | null>(() => {
    const selection = this._selection();
    if (selection?.type !== 'element') {
      return null;
    }
    return this.repository.elements().find((item) => item.key === selection.key) ?? null;
  });

  readonly selectedCable = computed<MapCable | null>(() => {
    const selection = this._selection();
    if (selection?.type !== 'cable') {
      return null;
    }
    return this.repository.mapCables().find((item) => item.id === selection.id) ?? null;
  });

  /** Elementos que passam pela busca e pela situação (base da listagem da legenda). */
  readonly filteredElements = computed<readonly MapElement[]>(() => {
    const term = normalize(this._search());
    const statuses = this._statusFilter();
    return this.repository
      .elements()
      .filter(
        (item) =>
          (item.kind === 'customer' ||
            statuses.size === 0 ||
            statuses.has(item.status as InfrastructureStatus)) &&
          (!term || normalize(item.name).includes(term)),
      );
  });

  /** Cabos que passam pela busca e pela situação. */
  readonly filteredCables = computed<readonly MapCable[]>(() => {
    const term = normalize(this._search());
    const statuses = this._statusFilter();
    return this.repository
      .mapCables()
      .filter(
        (item) =>
          (statuses.size === 0 || statuses.has(item.status)) &&
          (!term || normalize(item.name).includes(term)),
      );
  });

  /** O que aparece no mapa: filtrados e sem os grupos ocultos. */
  readonly visibleElements = computed<readonly MapElement[]>(() => {
    const hidden = this._hiddenGroups();
    return this.filteredElements().filter((item) => !hidden.has(item.group));
  });

  readonly visibleCables = computed<readonly MapCable[]>(() => {
    const hidden = this._hiddenGroups();
    return this.filteredCables().filter((item) => !hidden.has(item.role));
  });

  readonly hasActiveFilters = computed(
    () =>
      this._search().trim().length > 0 ||
      this._statusFilter().size > 0 ||
      this._hiddenGroups().size > 0,
  );

  constructor() {
    // Item excluído (ou recarregado sem ele): a seleção e a ficha somem.
    effect(() => {
      const selection = this._selection();
      if (selection && !this.selectedElement() && !this.selectedCable()) {
        this._selection.set(null);
      }
    });
  }

  select(selection: Selection): void {
    this._selection.set(selection);
  }

  setSearch(term: string): void {
    this._search.set(term);
  }

  setStatusFilter(statuses: readonly InfrastructureStatus[]): void {
    this._statusFilter.set(new Set(statuses));
  }

  toggleGroup(key: LegendGroupKey): void {
    this._hiddenGroups.update((current) => {
      const next = new Set(current);
      if (!next.delete(key)) {
        next.add(key);
      }
      return next;
    });
  }

  clearFilters(): void {
    this._search.set('');
    this._statusFilter.set(new Set());
    this._hiddenGroups.set(new Set());
  }
}

/** Minúsculas, sem acentos, com `-`/`_` como espaço. */
export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .trim();
}
