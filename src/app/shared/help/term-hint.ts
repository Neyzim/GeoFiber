import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { glossaryTerm } from '../../core/network/glossary';
import { GlossaryDialogComponent, GlossaryDialogData } from './glossary-dialog';

/** "?" ao lado de um termo técnico: dica curta ao passar o mouse, glossário ao clicar. */
@Component({
  selector: 'app-term-hint',
  imports: [MatIconModule, MatTooltipModule],
  template: `
    @if (term(); as item) {
      <button
        type="button"
        class="term-hint"
        [matTooltip]="item.short"
        [attr.aria-label]="item.term + ': ' + item.short"
        (click)="open($event)"
      >
        <mat-icon>help_outline</mat-icon>
      </button>
    }
  `,
  styles: `
    :host { display: inline-flex; vertical-align: middle; }
    .term-hint {
      display: inline-grid; place-items: center; width: 22px; height: 22px; padding: 0;
      border: 0; border-radius: 50%; background: none; cursor: help;
      color: var(--mat-sys-on-surface-variant);
    }
    .term-hint:hover, .term-hint:focus-visible { color: var(--mat-sys-primary); }
    mat-icon { width: 18px; height: 18px; font-size: 18px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermHintComponent {
  private readonly dialog = inject(MatDialog);

  /** Chave do termo em `GLOSSARY`. */
  readonly key = input.required<string>();
  protected readonly term = computed(() => glossaryTerm(this.key()));

  protected open(event: Event): void {
    event.stopPropagation();
    const term = this.term();
    if (!term) return;
    this.dialog.open<GlossaryDialogComponent, GlossaryDialogData>(GlossaryDialogComponent, {
      data: { query: term.term },
      width: '600px',
      maxWidth: '94vw',
    });
  }
}
