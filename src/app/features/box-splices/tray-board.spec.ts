import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BoxSheetStore } from '../network-map/box-sheet/box-sheet-store';
import { FakeBoxStore, fakeBoxStore } from '../../../testing/box-splices-fixtures';
import { TrayBoardComponent } from './tray-board';

function render(store: FakeBoxStore = fakeBoxStore(), canEdit = true) {
  TestBed.configureTestingModule({
    imports: [TrayBoardComponent],
    providers: [{ provide: BoxSheetStore, useValue: store }],
  });
  const fixture = TestBed.createComponent(TrayBoardComponent);
  fixture.componentRef.setInput('tray', store.trays()[0]);
  fixture.componentRef.setInput('canEdit', canEdit);
  fixture.detectChanges();
  return fixture;
}

function positions(fixture: ComponentFixture<TrayBoardComponent>): HTMLElement[] {
  return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[data-position]'));
}

describe('TrayBoardComponent', { timeout: 20000 }, () => {
  it('draws every position of the tray, empty ones included', () => {
    const fixture = render();
    const rows = positions(fixture);
    expect(rows.map((row) => row.dataset['position'])).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(rows[0].textContent).toContain('+ emendar aqui');
    expect(rows[1].textContent).toContain('CABO-01 Verde·2');
    expect(rows[1].textContent).toContain('CABO-02 Verde·3');
    expect(rows[1].querySelectorAll('app-fiber-dot').length).toBe(2);
    expect(rows[1].querySelector('.splice__sleeve')).toBeTruthy();
  });

  it('says "vazia" without edit permission and does not offer to splice', () => {
    const fixture = render(fakeBoxStore(), false);
    const first = positions(fixture)[0];
    expect(first.textContent).toContain('vazia');
    expect(first.textContent).not.toContain('emendar');
    expect(first.tagName).not.toBe('BUTTON');
  });

  it('tells which position was tapped', () => {
    const fixture = render();
    const tapped = vi.fn();
    const opened = vi.fn();
    fixture.componentInstance.positionTapped.subscribe(tapped);
    fixture.componentInstance.spliceTapped.subscribe(opened);

    positions(fixture)[0].click();
    expect(tapped).toHaveBeenCalledWith(1);
    positions(fixture)[1].click();
    expect(opened).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
  });

  it('lists old splices without a valid position below the tray', () => {
    const store = fakeBoxStore({
      splices: [
        { id: 'old', trayNumber: 1, inputFiberId: 'a1', outputFiberId: 'b1' },
        { id: 'big', trayNumber: 1, positionNumber: 30, inputFiberId: 'a4', outputFiberId: 'zz' },
      ],
    });
    const fixture = render(store);
    const band = (fixture.nativeElement as HTMLElement).querySelector('.tray__unplaced')!;
    expect(band.textContent).toContain('Sem posição definida');
    expect(band.querySelectorAll('[data-unplaced]').length).toBe(2);
    expect(band.textContent).toContain('Fibra de outro cabo');

    const deleted = vi.fn();
    fixture.componentInstance.deleteRequested.subscribe(deleted);
    band.querySelector<HTMLElement>('[data-unplaced] button[aria-label="Excluir emenda"]')!.click();
    expect(deleted).toHaveBeenCalledWith(expect.objectContaining({ id: 'old' }));
  });
});
