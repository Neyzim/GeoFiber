import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleChange, MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, map } from 'rxjs';
import { BASE_LAYERS, DEFAULT_MAP_VIEW } from '../../core/constants/map.constants';
import { GeoPoint, MapClickEvent, MapTool, MapViewState, PinMoveEvent } from '../../core/models/geo.model';
import { PIN_STATUSES, PIN_TYPES, Pin, PinDraft, PinStatus } from '../../core/models/pin.model';
import { MapPreferencesService } from '../../core/services/map-preferences';
import { NotificationService } from '../../core/services/notification';
import { PinStoreService } from '../../core/services/pin-store';
import { GeoMapComponent } from '../../shared/map/geo-map';
import { LegendItem, MapLegendComponent } from '../../shared/map/map-legend';
import { MapLayerPanelComponent } from '../../shared/map/map-layer-panel';
import { MapStatusBarComponent } from '../../shared/map/map-status-bar';
import { MapToolbarComponent } from '../../shared/map/map-toolbar';
import { PinFormDialogComponent, PinFormDialogData } from '../../shared/pin/pin-form-dialog';
import { PinListComponent } from '../../shared/pin/pin-list';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/ui/confirm-dialog';

/** Tela de desenho da rede: mapa + ferramentas + lista de PINs do projeto. */
@Component({
  selector: 'app-network-map-page',
  imports: [
    GeoMapComponent,
    MapLayerPanelComponent,
    MapLegendComponent,
    MapStatusBarComponent,
    MapToolbarComponent,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    PinListComponent,
  ],
  templateUrl: './network-map-page.html',
  styleUrl: './network-map-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NetworkMapPage {
  private readonly store = inject(PinStoreService);
  private readonly preferences = inject(MapPreferencesService);
  private readonly notifications = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly geoMap = viewChild.required(GeoMapComponent);

  protected readonly baseLayers = BASE_LAYERS;
  protected readonly statuses = PIN_STATUSES;
  protected readonly preferencesState = this.preferences;

  protected readonly pins = this.store.visiblePins;
  protected readonly selectedId = this.store.selectedId;
  protected readonly search = this.store.search;
  protected readonly hasActiveFilters = this.store.hasActiveFilters;
  protected readonly totalPins = this.store.total;

  protected readonly activeTool = signal<MapTool>('select');
  protected readonly showLayerPanel = signal(false);
  protected readonly pointer = signal<GeoPoint | null>(null);
  protected readonly view = signal<MapViewState | null>(null);

  protected readonly initialCenter = computed<GeoPoint>(
    () => this.preferences.lastView()?.center ?? DEFAULT_MAP_VIEW.center,
  );
  protected readonly initialZoom = computed<number>(
    () => this.preferences.lastView()?.zoom ?? DEFAULT_MAP_VIEW.zoom,
  );
  protected readonly visibleCount = computed(() => this.pins().length);
  protected readonly activeStatuses = computed<readonly PinStatus[]>(() => [
    ...this.store.statusFilter(),
  ]);

  protected readonly legendItems = computed<readonly LegendItem[]>(() => {
    const counts = this.store.typeCounts();
    const hidden = this.store.hiddenTypes();
    return PIN_TYPES.map((definition) => ({
      type: definition.type,
      label: definition.label,
      code: definition.code,
      color: definition.color,
      count: counts.get(definition.type) ?? 0,
      hidden: hidden.has(definition.type),
    }));
  });

  // --- Ferramentas ---------------------------------------------------------

  protected setTool(tool: MapTool): void {
    this.activeTool.set(tool);
    if (tool === 'addPin') {
      this.notifications.info('Clique no mapa para posicionar o novo PIN.');
    } else if (tool === 'move') {
      this.notifications.info('Arraste um PIN para corrigir a posição.');
    }
  }

  // --- Eventos do mapa -----------------------------------------------------

  protected onMapClick(event: MapClickEvent): void {
    if (event.tool === 'addPin') {
      this.openPinForm({ mode: 'create', position: event.position });
      return;
    }
    this.store.select(null);
  }

  protected onPinClick(pin: Pin): void {
    this.store.select(pin.id);
  }

  protected onPinMoved(event: PinMoveEvent): void {
    const pin = this.store.findById(event.pinId);
    if (!pin) {
      return;
    }
    this.store.moveTo(event.pinId, event.position);
    this.notifications.success(`Posição de "${pin.name}" atualizada.`);
  }

  protected onViewChanged(view: MapViewState): void {
    this.view.set(view);
    this.preferences.setLastView(view);
  }

  protected onPointerMove(position: GeoPoint | null): void {
    this.pointer.set(position);
  }

  protected onLocated(position: GeoPoint): void {
    this.notifications.success(
      `Localização obtida (${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}).`,
    );
  }

  // --- Ações sobre PINs ----------------------------------------------------

  protected createPinAtCenter(): void {
    const position = this.geoMap().getCenter() ?? DEFAULT_MAP_VIEW.center;
    this.openPinForm({ mode: 'create', position });
  }

  protected editPin(pin: Pin): void {
    this.openPinForm({ mode: 'edit', pin });
  }

  protected removePin(pin: Pin): void {
    this.confirm({
      title: 'Remover PIN',
      message: `Tem certeza que deseja remover "${pin.name}" do projeto?`,
      confirmLabel: 'Remover',
      danger: true,
    }).subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.store.remove(pin.id);
      this.notifications.success(`PIN "${pin.name}" removido.`);
    });
  }

  protected clearAllPins(): void {
    this.confirm({
      title: 'Remover todos os PINs',
      message: `Isso apagará ${this.totalPins()} PIN(s) do projeto. A ação não pode ser desfeita.`,
      confirmLabel: 'Remover todos',
      danger: true,
    }).subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.store.clearAll();
      this.notifications.success('Todos os PINs foram removidos.');
    });
  }

  protected zoomToPin(pin: Pin): void {
    this.geoMap().flyTo(pin.position, 17);
    this.store.select(pin.id);
  }

  // --- Navegação -----------------------------------------------------------

  protected fitToPins(): void {
    if (!this.geoMap().fitToPins(this.pins())) {
      this.notifications.warning('Nenhum PIN visível para enquadrar.');
    }
  }

  protected zoomIn(): void {
    this.geoMap().zoomIn();
  }

  protected zoomOut(): void {
    this.geoMap().zoomOut();
  }

  protected locate(): void {
    this.geoMap().locate();
  }

  // --- Camadas e filtros ---------------------------------------------------

  protected toggleLayerPanel(): void {
    this.showLayerPanel.update((visible) => !visible);
  }

  protected toggleLegend(): void {
    this.preferences.setShowLegend(!this.preferences.showLegend());
  }

  protected onBaseLayerChange(key: string): void {
    this.preferences.setBaseLayer(key);
  }

  protected onOpacityChange(opacity: number): void {
    this.preferences.setBaseLayerOpacity(opacity);
  }

  protected onSearchChange(term: string): void {
    this.store.setSearch(term);
  }

  protected onSearchInput(event: Event): void {
    this.onSearchChange((event.target as HTMLInputElement).value);
  }

  protected clearSearch(): void {
    this.store.setSearch('');
  }

  protected onStatusFilterChange(statuses: readonly PinStatus[]): void {
    this.store.setStatusFilter(statuses);
  }

  /** Converte a seleção múltipla dos botões de situação em filtro do store. */
  protected onStatusToggle(event: MatButtonToggleChange): void {
    const value = event.value;
    const statuses = Array.isArray(value)
      ? (value as PinStatus[])
      : value
        ? [value as PinStatus]
        : [];
    this.onStatusFilterChange(statuses);
  }

  protected toggleTypeVisibility(type: Pin['type']): void {
    this.store.toggleTypeVisibility(type);
  }

  protected clearFilters(): void {
    this.store.resetFilters();
  }

  // --- Diálogos ------------------------------------------------------------

  private openPinForm(data: PinFormDialogData): void {
    this.dialog
      .open<PinFormDialogComponent, PinFormDialogData, PinDraft>(PinFormDialogComponent, {
        data,
        width: '600px',
        maxWidth: '94vw',
        autoFocus: 'first-tabbable',
      })
      .afterClosed()
      .subscribe((draft) => {
        if (!draft) {
          return;
        }
        if (data.mode === 'edit' && data.pin) {
          this.store.update(data.pin.id, draft);
          this.notifications.success(`PIN "${draft.name}" atualizado.`);
          return;
        }
        this.store.add(draft);
        this.notifications.success(`PIN "${draft.name}" criado.`);
      });
  }

  private confirm(data: ConfirmDialogData): Observable<boolean> {
    return this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
        data,
        width: '440px',
        maxWidth: '92vw',
      })
      .afterClosed()
      .pipe(map((confirmed) => confirmed === true));
  }
}
