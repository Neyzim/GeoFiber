import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { glossaryTerm } from '../../core/network/glossary';
import { CABLE_ROLES, ELEMENT_GROUPS } from '../../core/network/network-catalog';
import { GlossaryDialogComponent } from './glossary-dialog';

export interface ViewHelpData {
  /** Frase de `describeView`. */
  summary: string;
}

const GROUP_TERMS: Readonly<Record<string, string>> = {
  olt: 'olt',
  CTO: 'cto',
  CEO: 'ceo',
  DIO: 'dio',
  customer: 'cliente',
};

/** "O que estou vendo?": o que está na tela, o que cada cor significa e o que dá para fazer. */
@Component({
  selector: 'app-view-help-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>O que estou vendo?</h2>
    <mat-dialog-content class="view-help">
      <p class="view-help__lead">{{ data.summary }}</p>

      <h3>Pontos no mapa</h3>
      <ul>
        @for (group of groups; track group.group) {
          <li>
            <span class="view-help__dot" [style.background]="group.color"></span>
            <span><strong>{{ group.label }}</strong> — {{ group.meaning }}</span>
          </li>
        }
      </ul>

      <h3>Linhas (cabos)</h3>
      <p class="view-help__hint">A cor diz para que serve o cabo:</p>
      <ul>
        @for (role of roles; track role.role) {
          <li>
            <span class="view-help__line" [style.background]="role.color"></span>
            <span>{{ role.label }}</span>
          </li>
        }
      </ul>
      <p class="view-help__hint">
        Linha tracejada: ainda planejado. Tracejado vermelho: danificado. Cinza claro: desativado.
      </p>

      <h3>O que dá para fazer</h3>
      <ul class="view-help__tips">
        <li>Clique num ponto ou numa linha para abrir a ficha com os detalhes.</li>
        <li>Use a legenda para buscar pelo nome e esconder ou mostrar grupos.</li>
        <li>Os "?" ao lado das palavras técnicas explicam o que elas querem dizer.</li>
      </ul>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="openGlossary()">
        <mat-icon>menu_book</mat-icon>
        Abrir glossário
      </button>
      <button mat-flat-button type="button" mat-dialog-close>Entendi</button>
    </mat-dialog-actions>
  `,
  styles: `
    .view-help { display: flex; flex-direction: column; gap: 8px; }
    .view-help__lead { margin: 0 0 8px; padding: 12px; border-radius: var(--gf-radius-panel);
      background: var(--mat-sys-surface-container, #eef2f6); font: var(--mat-sys-body-large); }
    h3 { margin: 8px 0 4px; font: var(--mat-sys-title-small); }
    ul { display: flex; flex-direction: column; gap: 4px; margin: 0; padding: 0; list-style: none; }
    li { display: flex; align-items: center; gap: 8px; font: var(--mat-sys-body-medium); }
    .view-help__tips { padding-left: 20px; list-style: disc; }
    .view-help__tips li { display: list-item; }
    .view-help__dot { flex: none; width: 14px; height: 14px; border-radius: 50%; }
    .view-help__line { flex: none; width: 28px; height: 5px; border-radius: 3px; }
    .view-help__hint { margin: 0; color: var(--mat-sys-on-surface-variant); font: var(--mat-sys-body-small); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewHelpDialogComponent {
  protected readonly data = inject<ViewHelpData>(MAT_DIALOG_DATA);
  private readonly dialog = inject(MatDialog);

  protected readonly groups = ELEMENT_GROUPS.map((group) => ({
    group: group.group,
    label: group.longLabel,
    color: group.color,
    meaning: glossaryTerm(GROUP_TERMS[group.group] ?? '')?.short ?? '',
  }));
  protected readonly roles = CABLE_ROLES;

  protected openGlossary(): void {
    this.dialog.open(GlossaryDialogComponent, { width: '600px', maxWidth: '94vw' });
  }
}
