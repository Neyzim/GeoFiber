import { Directive, ElementRef, inject, output } from '@angular/core';
import { SHEET_OPEN, dragEnd, dragHeight } from '../../core/network/sheet-drag';

/** Mesmo corte de `sheet-frame.scss`: abaixo disso a ficha é gaveta. */
const MOBILE_QUERY = '(max-width: 899.98px)';

/**
 * Gaveta arrastável no celular: a alça (`[data-sheet-grip]`, dentro do host) muda a altura entre 0 e
 * 90% da tela (`--gf-sheet-height`); soltar abaixo de 20% emite `sheetDismiss`. No computador não faz nada.
 */
@Directive({
  selector: '[appSheetDrag]',
  host: {
    '(pointerdown)': 'start($event)',
    '(document:pointermove)': 'move($event)',
    '(document:pointerup)': 'end()',
    '(document:pointercancel)': 'end()',
  },
})
export class SheetDragDirective {
  readonly sheetDismiss = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private fraction = SHEET_OPEN;
  private drag: { startY: number; startFraction: number } | null = null;

  protected start(event: PointerEvent): void {
    const target = event.target as Element | null;
    if (!target?.closest('[data-sheet-grip]') || !isMobile()) return;
    this.drag = { startY: event.clientY, startFraction: this.fraction };
    event.preventDefault();
  }

  protected move(event: PointerEvent): void {
    if (!this.drag) return;
    this.setFraction(dragHeight(this.drag.startFraction, event.clientY - this.drag.startY, window.innerHeight));
  }

  protected end(): void {
    if (!this.drag) return;
    this.drag = null;
    const result = dragEnd(this.fraction);
    if (result === 'dismiss') {
      this.setFraction(SHEET_OPEN);
      this.sheetDismiss.emit();
    }
  }

  private setFraction(fraction: number): void {
    this.fraction = fraction;
    this.host.style.setProperty('--gf-sheet-height', `${Math.round(fraction * 100)}dvh`);
  }
}

function isMobile(): boolean {
  return typeof matchMedia === 'function' && matchMedia(MOBILE_QUERY).matches;
}
