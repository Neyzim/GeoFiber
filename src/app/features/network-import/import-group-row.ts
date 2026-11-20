import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { POINT_TARGETS, LINE_TARGETS, type ImportGroup, type ImportTarget } from '../../core/import/import-groups';
import { targetOf } from '../../core/import/import-request';
import type { KmlPlacemark } from '../../core/import/kml-reader';
import { NetworkImportStore } from './network-import-store';

/** Quantos itens aparecem por vez ao abrir um grupo. */
const PAGE = 200;

/** Uma linha da tela de importação: um grupo de itens parecidos, com o tipo e a lista de itens. */
@Component({
  selector: 'app-import-group-row',
  templateUrl: './import-group-row.html',
  styleUrl: './import-group-row.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportGroupRowComponent {
  readonly group = input.required<ImportGroup>();
  protected readonly store = inject(NetworkImportStore);

  protected readonly open = signal(false);
  protected readonly shown = signal(PAGE);

  protected readonly page = PAGE;
  protected readonly isLine = computed(() => this.group().geometry === 'line');
  protected readonly targets = computed(() =>
    this.isLine() ? LINE_TARGETS : POINT_TARGETS,
  );
  protected readonly choice = computed<ImportTarget | null>(
    () => this.store.choices().groups.get(this.group().key)?.target ?? null,
  );
  protected readonly fibers = computed(
    () => this.store.choices().groups.get(this.group().key)?.fiberCapacity ?? 12,
  );

  /** Itens que vão ser importados (ou atualizados), por situação. */
  protected readonly counts = computed(() => {
    const counts = { total: 0, novos: 0, existem: 0, mudaram: 0 };
    for (const item of this.group().items) {
      const target = targetOf(this.group(), item, this.store.choices());
      if (target === null || target === 'IGNORE') continue;
      counts.total++;
      const status = this.store.matches().get(item.ref)?.status;
      if (status === 'same') counts.existem++;
      else if (status === 'moved') counts.mudaram++;
      else counts.novos++;
    }
    return counts;
  });

  protected readonly sample = computed(() => {
    const names = this.group().items.map((i) => i.name).filter((n) => n !== '').slice(0, 3);
    return names.length ? `${names.join(', ')} …` : '(sem nome)';
  });

  protected readonly visibleItems = computed<readonly KmlPlacemark[]>(() =>
    this.group().items.slice(0, this.shown()),
  );

  protected readonly iconUrl = computed(() => {
    const href = this.group().style.iconHref;
    return href ? this.store.icons().get(href) ?? null : null;
  });

  protected readonly swatch = computed(() => this.group().style.iconColor ?? this.group().style.lineColor ?? '#888');

  /** Situação de um item: `novo`, `já existe`, `já existe em outro lugar`. */
  protected statusOf(ref: string): string {
    const status = this.store.matches().get(ref)?.status;
    if (status === 'same') return 'já existe';
    if (status === 'moved') return 'já existe em outro lugar';
    return 'novo';
  }

  protected itemTarget(ref: string): string {
    return this.store.choices().items.get(ref) ?? '';
  }

  protected toggle(): void {
    this.open.update((v) => !v);
  }

  protected more(): void {
    this.shown.update((n) => n + PAGE);
  }

  protected onGroupTarget(value: string): void {
    this.store.setGroupTarget(this.group().key, value === '' ? null : (value as ImportTarget));
  }

  protected onFibers(value: string): void {
    this.store.setGroupFibers(this.group().key, Number(value));
  }

  protected onItemTarget(ref: string, value: string): void {
    this.store.setItemTarget(ref, value === '' ? null : (value as ImportTarget));
  }

  protected onMove(ref: string, checked: boolean): void {
    this.store.setMove(ref, checked);
  }

  protected takenBy(ref: string): string | undefined {
    const match = this.store.matches().get(ref);
    return match?.status === 'new' ? match.nameTakenByOtherType : undefined;
  }

  protected isMoved(ref: string): boolean {
    return this.store.matches().get(ref)?.status === 'moved';
  }

  protected isMovedChosen(ref: string): boolean {
    return this.store.choices().moves.has(ref);
  }
}
