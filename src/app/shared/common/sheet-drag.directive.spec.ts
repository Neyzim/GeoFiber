import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SheetDragDirective } from './sheet-drag.directive';

@Component({
  imports: [SheetDragDirective],
  template: `<aside class="sheet" appSheetDrag (sheetDismiss)="dismissed = dismissed + 1">
    <div class="sheet__grip" data-sheet-grip></div>
    <p class="body">conteúdo</p>
  </aside>`,
})
class HostComponent {
  dismissed = 0;
}

function pointer(target: EventTarget, type: string, clientY: number): void {
  target.dispatchEvent(new MouseEvent(type, { clientY, bubbles: true }));
}

describe('SheetDragDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let aside: HTMLElement;
  let grip: HTMLElement;

  function setup(mobile: boolean): void {
    vi.stubGlobal('innerHeight', 1000);
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: mobile, media: query }));
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    aside = (fixture.nativeElement as HTMLElement).querySelector('aside')!;
    grip = aside.querySelector('[data-sheet-grip]')!;
  }

  afterEach(() => vi.unstubAllGlobals());

  it('puxar a alça para baixo além do mínimo fecha a ficha', () => {
    setup(true);
    pointer(grip, 'pointerdown', 500);
    pointer(document, 'pointermove', 900);
    pointer(document, 'pointerup', 900);
    expect(fixture.componentInstance.dismissed).toBe(1);
  });

  it('um toque na alça, sem arrastar, não fecha', () => {
    setup(true);
    pointer(grip, 'pointerdown', 500);
    pointer(document, 'pointerup', 500);
    expect(fixture.componentInstance.dismissed).toBe(0);
  });

  it('puxar para cima expande livremente, até 90% da tela', () => {
    setup(true);
    pointer(grip, 'pointerdown', 500);
    pointer(document, 'pointermove', 100);
    expect(aside.style.getPropertyValue('--gf-sheet-height')).toBe('75dvh');
    pointer(document, 'pointermove', 0);
    pointer(document, 'pointerup', 0);
    expect(aside.style.getPropertyValue('--gf-sheet-height')).toBe('85dvh');
    expect(fixture.componentInstance.dismissed).toBe(0);
  });

  it('arrastar fora da alça não mexe na ficha', () => {
    setup(true);
    pointer(aside.querySelector('.body')!, 'pointerdown', 500);
    pointer(document, 'pointermove', 900);
    pointer(document, 'pointerup', 900);
    expect(fixture.componentInstance.dismissed).toBe(0);
  });

  it('no computador a alça não faz nada', () => {
    setup(false);
    pointer(grip, 'pointerdown', 500);
    pointer(document, 'pointermove', 900);
    pointer(document, 'pointerup', 900);
    expect(fixture.componentInstance.dismissed).toBe(0);
    expect(aside.style.getPropertyValue('--gf-sheet-height')).toBe('');
  });
});
