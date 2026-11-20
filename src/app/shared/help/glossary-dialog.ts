import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { searchGlossary } from '../../core/network/glossary';

export interface GlossaryDialogData {
  /** Termo já pesquisado ao abrir. */
  query?: string;
}

/** Glossário pesquisável da rede óptica, em linguagem simples. */
@Component({
  selector: 'app-glossary-dialog',
  imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Glossário</h2>
    <mat-dialog-content class="glossary">
      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="glossary__search">
        <mat-label>Procurar termo</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput [value]="query()" (input)="query.set($any($event.target).value)" />
      </mat-form-field>
      <dl class="glossary__list">
        @for (term of results(); track term.key) {
          <div class="glossary__item">
            <dt>{{ term.term }}</dt>
            <dd>
              <strong>{{ term.short }}</strong>
              <span>{{ term.long }}</span>
            </dd>
          </div>
        } @empty {
          <p class="glossary__empty">Nenhum termo encontrado. Tente outra palavra.</p>
        }
      </dl>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button type="button" mat-dialog-close>Fechar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .glossary { display: flex; flex-direction: column; gap: 12px; }
    .glossary__search { width: 100%; }
    .glossary__list { display: flex; flex-direction: column; gap: 10px; margin: 0; }
    .glossary__item { padding: 10px 12px; border-radius: 10px; background: var(--mat-sys-surface-container, #eef2f6); }
    dt { font: var(--mat-sys-title-small); }
    dd { display: flex; flex-direction: column; gap: 4px; margin: 4px 0 0; font: var(--mat-sys-body-medium); }
    dd span { color: var(--mat-sys-on-surface-variant); }
    .glossary__empty { margin: 0; color: var(--mat-sys-on-surface-variant); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlossaryDialogComponent {
  private readonly data = inject<GlossaryDialogData | null>(MAT_DIALOG_DATA, { optional: true });

  readonly query = signal(this.data?.query ?? '');
  readonly results = computed(() => searchGlossary(this.query()));
}
