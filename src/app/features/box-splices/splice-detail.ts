import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SpliceResponse } from '../../core/api/api-types';
import {
  diagramEnd,
  fiberLabel,
  formatAttenuation,
  spliceMiddle,
} from '../../core/network/box-interior';
import { DiagramLineComponent } from '../../shared/diagram/diagram-line.component';
import { BoxSheetStore } from '../network-map/box-sheet/box-sheet-store';

/** Consulta de uma emenda: de onde chega, para onde sai, perda; ver os cabos e excluir. */
@Component({
  selector: 'app-splice-detail',
  imports: [DiagramLineComponent, MatButtonModule, MatIconModule],
  template: `<section class="detail" aria-labelledby="detail-title">
    <header class="detail__head">
      <h3 id="detail-title">{{ title() }}</h3>
      <button mat-icon-button type="button" aria-label="Fechar" (click)="closed.emit()">
        <mat-icon>close</mat-icon>
      </button>
    </header>

    <app-diagram-line [entrada]="inputEnd()" [middle]="middle()" [saida]="outputEnd()" />

    <div class="detail__facts">
      <p><span>Chega:</span> {{ inputText() }}</p>
      <p><span>Sai:</span> {{ outputText() }}</p>
      @if (loss(); as value) {
        <p><span>Perda:</span> {{ value }}</p>
      }
    </div>

    <div class="detail__actions">
      @for (cable of cables(); track cable.id) {
        <button mat-stroked-button type="button" [attr.data-cable]="cable.id" (click)="viewCable.emit(cable.id)">
          Ver {{ cable.name }} no mapa
        </button>
      }
      @if (canEdit()) {
        <button mat-button type="button" class="detail__danger" data-action="excluir-emenda"
          (click)="deleteRequested.emit(splice())">
          <mat-icon>delete_outline</mat-icon>
          Excluir emenda
        </button>
      }
    </div>
  </section>`,
  styles: `
    :host { display: block; }
    .detail { display: flex; flex-direction: column; gap: 12px; padding: 16px; font-family: var(--gf-font-ui); }
    .detail__head {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      h3 { margin: 0; font: var(--mat-sys-title-medium); }
    }
    .detail__facts {
      display: flex; flex-direction: column; gap: 4px; margin: 0; font: var(--mat-sys-body-medium);
      p { margin: 0; }
      span { color: var(--gf-text-2); }
    }
    .detail__actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .detail__danger { color: var(--gf-status-critical); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpliceDetailComponent {
  private readonly store = inject(BoxSheetStore);

  readonly splice = input.required<SpliceResponse>();
  readonly canEdit = input(true);

  readonly closed = output<void>();
  readonly viewCable = output<string>();
  readonly deleteRequested = output<SpliceResponse>();

  private readonly input = computed(() => this.fiber(this.splice().inputFiberId));
  private readonly output = computed(() => this.fiber(this.splice().outputFiberId));

  protected readonly title = computed(() => {
    const { positionNumber, trayNumber } = this.splice();
    const where = positionNumber !== undefined ? `Posição ${positionNumber}` : 'Sem posição';
    return `${where} · Bandeja ${trayNumber}`;
  });
  protected readonly inputText = computed(() => fiberLabel(this.input()));
  protected readonly outputText = computed(() => fiberLabel(this.output()));
  protected readonly loss = computed(() => formatAttenuation(this.splice().attenuationDb));
  protected readonly inputEnd = computed(() => diagramEnd(this.input()) ?? { cable: 'Fibra de outro cabo' });
  protected readonly outputEnd = computed(() => diagramEnd(this.output()) ?? { cable: 'Fibra de outro cabo' });
  protected readonly middle = computed(() => spliceMiddle(this.splice()));

  /** Os cabos das duas fibras, sem repetir. */
  protected readonly cables = computed(() => {
    const result: { id: string; name: string }[] = [];
    for (const info of [this.input(), this.output()]) {
      if (info && !result.some((item) => item.id === info.cableId)) {
        result.push({ id: info.cableId, name: info.cableName });
      }
    }
    return result;
  });

  private fiber(id: string | undefined) {
    return id ? this.store.fiberIndex().get(id) : undefined;
  }
}
