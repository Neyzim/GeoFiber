import { ChangeDetectionStrategy, Component, computed, inject, viewChild, ElementRef } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { MapReturnService } from '../../core/services/map-return';
import type { GeoPoint } from '../../core/models/geo.model';
import { GeoMapComponent } from '../../shared/map/geo-map';
import { INFRA_STATUSES } from '../../core/network/network-catalog';
import { NetworkMapState } from '../../core/network/network-map-state';
import type { InfrastructureStatus } from '../../core/api/api-types';
import type { ImportNetworkResponse } from '../../core/api/import-types';
import { ImportGroupRowComponent } from './import-group-row';
import { NetworkImportStore } from './network-import-store';

/** Página `/importar`: escolher o KMZ/KML, decidir o que cada grupo vira e importar de uma vez. */
@Component({
  selector: 'app-network-import-page',
  imports: [MatIconModule, RouterLink, ImportGroupRowComponent, GeoMapComponent],
  templateUrl: './network-import-page.html',
  styleUrl: './network-import-page.scss',
  providers: [NetworkImportStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NetworkImportPage {
  protected readonly store = inject(NetworkImportStore);
  private readonly mapState = inject(NetworkMapState);
  private readonly mapReturn = inject(MapReturnService);
  private readonly router = inject(Router);
  protected readonly canEdit = this.mapState.canEdit;
  protected readonly usageOptions = INFRA_STATUSES;

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly pointGroups = computed(() =>
    this.store.groups().filter((g) => g.geometry === 'point'),
  );
  protected readonly lineGroups = computed(() =>
    this.store.groups().filter((g) => g.geometry === 'line'),
  );

  protected readonly importLabel = computed(() => {
    const total = this.store.summary().total;
    return `Importar ${total} ${total === 1 ? 'item' : 'itens'}`;
  });

  protected readonly canImport = computed(
    () =>
      this.store.state() !== 'saving' &&
      this.store.summary().undecidedGroups === 0 &&
      this.store.summary().total > 0,
  );

  protected readonly resultText = computed(() => {
    const result = this.store.result();
    if (!result) return '';
    const parts = resultParts(result).filter((p) => p !== '');
    return parts.length ? `Importação concluída: ${parts.join(', ')}.` : 'Importação concluída.';
  });

  protected chooseFile(): void {
    this.fileInput()?.nativeElement.click();
  }

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) void this.store.open(file);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) void this.store.open(file);
  }

  /** Leva o mapa a enquadrar estas posições e abre o mapa. */
  protected viewOnMap(points: readonly GeoPoint[]): void {
    this.mapReturn.requestFit(points);
    void this.router.navigate(['/']);
  }

  protected onUsage(value: string): void {
    this.store.setUsageStatus(value as InfrastructureStatus);
  }

  protected onLinkEnds(checked: boolean): void {
    this.store.setLinkCableEnds(checked);
  }
}

function plural(count: number, one: string, many: string): string {
  return count === 0 ? '' : `${count} ${count === 1 ? one : many}`;
}

function resultParts(r: ImportNetworkResponse): string[] {
  return [
    plural((r.created?.boxes ?? 0), 'caixa', 'caixas'),
    plural((r.created?.olts ?? 0), 'OLT', 'OLTs'),
    plural((r.created?.cables ?? 0), 'cabo', 'cabos'),
    plural(r.moved ?? 0, 'posição atualizada', 'posições atualizadas'),
    plural(r.reshaped ?? 0, 'traçado atualizado', 'traçados atualizados'),
    plural((r.created?.attachments ?? 0), 'ligação de cabo', 'ligações de cabo'),
  ];
}
