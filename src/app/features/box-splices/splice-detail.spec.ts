import { TestBed } from '@angular/core/testing';
import { BoxSheetStore } from '../network-map/box-sheet/box-sheet-store';
import { DEFAULT_SPLICES, fakeBoxStore } from '../../../testing/box-splices-fixtures';
import { SpliceDetailComponent } from './splice-detail';

function render(canEdit = true, splice = DEFAULT_SPLICES[0]) {
  TestBed.configureTestingModule({
    imports: [SpliceDetailComponent],
    providers: [{ provide: BoxSheetStore, useValue: fakeBoxStore() }],
  });
  const fixture = TestBed.createComponent(SpliceDetailComponent);
  fixture.componentRef.setInput('splice', splice);
  fixture.componentRef.setInput('canEdit', canEdit);
  fixture.detectChanges();
  return fixture;
}

describe('SpliceDetailComponent', { timeout: 20000 }, () => {
  it('tells where the splice is, where it comes from and where it goes', () => {
    const fixture = render();
    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(content).toContain('Posição 2 · Bandeja 1');
    expect(content).toContain('Chega: CABO-01, tubo 1 (Verde), fibra 2 (Amarelo)');
    expect(content).toContain('Sai: CABO-02, tubo 1 (Verde), fibra 3 (Branco)');
    expect(content).toContain('Perda: 0,05 dB');
  });

  it('opens each cable on the map', () => {
    const fixture = render();
    const viewed = vi.fn();
    fixture.componentInstance.viewCable.subscribe(viewed);
    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[data-cable]'),
    );
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      'Ver CABO-01 no mapa',
      'Ver CABO-02 no mapa',
    ]);
    buttons[1].click();
    expect(viewed).toHaveBeenCalledWith('c2');
  });

  it('offers "Excluir emenda" only with edit permission', () => {
    const fixture = render();
    const deleted = vi.fn();
    fixture.componentInstance.deleteRequested.subscribe(deleted);
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('[data-action="excluir-emenda"]')!
      .click();
    expect(deleted).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));

    TestBed.resetTestingModule();
    const readOnly = render(false);
    expect(
      (readOnly.nativeElement as HTMLElement).querySelector('[data-action="excluir-emenda"]'),
    ).toBeNull();
  });
});
