import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/** Uma aba das fichas laterais. */
export interface SheetTab {
  id: string;
  label: string;
}

/** Barra de abas das fichas (Resumo, Fibras, Portas…). Use `[(active)]`. */
@Component({
  selector: 'app-sheet-tabs',
  template: `<div role="tablist" class="tabs">
    @for (tab of tabs(); track tab.id) {
      <button
        role="tab"
        type="button"
        class="tabs__tab"
        [attr.data-tab]="tab.id"
        [attr.aria-selected]="active() === tab.id"
        [class.is-active]="active() === tab.id"
        (click)="active.set(tab.id)"
      >{{ tab.label }}</button>
    }
  </div>`,
  styles: `
    .tabs {
      display: flex;
      gap: 4px;
      border-bottom: 1px solid var(--gf-border);
    }

    .tabs__tab {
      position: relative;
      min-height: var(--gf-touch);
      padding: 0 12px;
      border: 0;
      background: none;
      color: var(--gf-text-2);
      font: 500 12px/1 var(--gf-font-ui);
      cursor: pointer;
    }

    .tabs__tab::after {
      content: '';
      position: absolute;
      left: 8px;
      right: 8px;
      bottom: -1px;
      height: 2px;
      background: var(--gf-accent);
      transform: scaleX(0);
      transition: transform 160ms ease;
    }

    .tabs__tab.is-active {
      color: var(--gf-accent);
    }

    .tabs__tab.is-active::after {
      transform: scaleX(1);
    }

    .tabs__tab:focus-visible {
      outline: 2px solid var(--gf-accent);
      outline-offset: -2px;
    }

    @media (prefers-reduced-motion: reduce) {
      .tabs__tab::after {
        transition: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetTabsComponent {
  readonly tabs = input.required<readonly SheetTab[]>();
  readonly active = model.required<string>();
}
