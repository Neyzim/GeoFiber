import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BoxSheetStore } from '../network-map/box-sheet/box-sheet-store';
import {
  DEFAULT_CABLES,
  FakeBoxStore,
  fakeBoxStore,
} from '../../../testing/box-splices-fixtures';
import { CableStripComponent } from './cable-strip';

function render(store: FakeBoxStore = fakeBoxStore()) {
  TestBed.configureTestingModule({
    imports: [CableStripComponent],
    providers: [{ provide: BoxSheetStore, useValue: store }],
  });
  const fixture = TestBed.createComponent(CableStripComponent);
  fixture.detectChanges();
  return fixture;
}

function bar(fixture: ComponentFixture<CableStripComponent>, cableId: string): HTMLElement {
  return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
    `[data-cable-bar="${cableId}"]`,
  )!;
}

describe('CableStripComponent', { timeout: 20000 }, () => {
  it('shows one bar per cable with its role here, fibers and tube stripes', () => {
    const fixture = render();
    const cable = bar(fixture, 'c1');
    expect(cable.textContent).toContain('CABO-01');
    expect(cable.textContent).toContain('chega aqui');
    expect(cable.textContent).toContain('8 fibras');
    expect(cable.querySelectorAll('.bar__stripe').length).toBe(2);
    expect(bar(fixture, 'c2').textContent).toContain('sai daqui');
  });

  it('opens a cable to show where each fiber is spliced, and closes it again', () => {
    const fixture = render();
    const cable = bar(fixture, 'c1');
    cable.click();
    fixture.detectChanges();
    expect(cable.getAttribute('aria-expanded')).toBe('true');

    const root = fixture.nativeElement as HTMLElement;
    const detail = root.querySelector<HTMLElement>('.strip__detail')!;
    expect(detail.querySelectorAll('[data-tube]').length).toBe(2);
    const a2 = detail.querySelector<HTMLElement>('[data-fiber="a2"]')!;
    expect(a2.textContent).toContain('emendada na bandeja 1, posição 2');
    expect(detail.querySelector('[data-fiber="a1"]')!.textContent).toContain('livre nesta caixa');
    expect(detail.querySelector('[data-fiber="a3"]')!.textContent).toContain('rompida');

    cable.click();
    fixture.detectChanges();
    expect(root.querySelector('.strip__detail')).toBeNull();
  });

  it('warns about a cable without tubes and fibers, with a shortcut to its sheet', () => {
    const fixture = render(fakeBoxStore({ cables: DEFAULT_CABLES, fibers: { c1: [] } }));
    const opened = vi.fn();
    fixture.componentInstance.openCable.subscribe(opened);
    bar(fixture, 'c1').click();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain(
      'Este cabo ainda não tem tubos e fibras. Cadastre na ficha do cabo.',
    );
    root.querySelector<HTMLElement>('[data-action="ficha-do-cabo"]')!.click();
    expect(opened).toHaveBeenCalledWith('c1');
  });
});
