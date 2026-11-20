import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BoxSheetStore } from '../network-map/box-sheet/box-sheet-store';
import {
  DEFAULT_CABLES,
  FakeBoxStore,
  fakeBoxStore,
} from '../../../testing/box-splices-fixtures';
import { SplicePickerComponent } from './splice-picker';

function render(store: FakeBoxStore = fakeBoxStore()) {
  TestBed.configureTestingModule({
    imports: [SplicePickerComponent],
    providers: [{ provide: BoxSheetStore, useValue: store }],
  });
  const fixture = TestBed.createComponent(SplicePickerComponent);
  fixture.componentRef.setInput('trayNumber', 1);
  fixture.componentRef.setInput('position', 6);
  fixture.detectChanges();
  return { fixture, store };
}

type Fixture = ComponentFixture<SplicePickerComponent>;

function root(fixture: Fixture): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function column(fixture: Fixture, side: 'in' | 'out'): HTMLElement {
  return root(fixture).querySelector<HTMLElement>(`[data-side="${side}"]`)!;
}

function fiber(fixture: Fixture, side: 'in' | 'out', id: string): HTMLElement {
  return column(fixture, side).querySelector<HTMLElement>(`[data-fiber="${id}"]`)!;
}

function click(fixture: Fixture, element: HTMLElement): void {
  element.click();
  fixture.detectChanges();
}

function hint(fixture: Fixture): string {
  return root(fixture).querySelector('.picker__hint')?.textContent?.trim() ?? '';
}

function saveButton(fixture: Fixture): HTMLButtonElement {
  return root(fixture).querySelector<HTMLButtonElement>('[data-action="registrar"]')!;
}

function cableButton(fixture: Fixture, side: 'in' | 'out', cableId: string): HTMLElement {
  return column(fixture, side).querySelector<HTMLElement>(`[data-cable="${cableId}"]`)!;
}

describe('SplicePickerComponent', { timeout: 20000 }, () => {
  it('names the position and starts with the arriving cable on the left', () => {
    const { fixture } = render();
    expect(root(fixture).textContent).toContain('Emenda na posição 6 · Bandeja 1');
    expect(cableButton(fixture, 'in', 'c1').getAttribute('aria-pressed')).toBe('true');
    expect(cableButton(fixture, 'out', 'c2').getAttribute('aria-pressed')).toBe('true');
    expect(column(fixture, 'in').querySelectorAll('[data-tube]').length).toBe(2);
    expect(hint(fixture)).toBe('Toque na fibra do CABO-01 que chega.');
    expect(saveButton(fixture).disabled).toBe(true);
  });

  it('dims fibers whose end is in use and explains why when tapped', () => {
    const { fixture } = render();
    const busy = fiber(fixture, 'in', 'a2');
    expect(busy.getAttribute('aria-disabled')).toBe('true');
    click(fixture, busy);
    expect(hint(fixture)).toBe('Esta fibra está já emendada na bandeja 1, posição 2.');
    expect(busy.getAttribute('aria-pressed')).toBe('false');

    click(fixture, fiber(fixture, 'in', 'a3'));
    expect(hint(fixture)).toBe('Esta fibra está rompida.');
  });

  it('guides each step and sends both fibers, explicit ends, position and loss', () => {
    const { fixture, store } = render();
    click(fixture, fiber(fixture, 'in', 'a1'));
    expect(fiber(fixture, 'in', 'a1').getAttribute('aria-pressed')).toBe('true');
    expect(hint(fixture)).toBe('Verde (fibra 1) do CABO-01 escolhida. Agora a fibra do CABO-02.');

    click(fixture, fiber(fixture, 'out', 'b1'));
    expect(hint(fixture)).toBe('Pronto. Confira e toque em "Registrar emenda".');

    const loss = root(fixture).querySelector<HTMLInputElement>('input[name="perda"]')!;
    loss.value = '0,05';
    loss.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const done = vi.fn();
    fixture.componentInstance.done.subscribe(done);
    store.saveSplice.mockImplementation((_body: unknown, callback: (error: string | null) => void) =>
      callback(null),
    );
    click(fixture, saveButton(fixture));
    expect(store.saveSplice).toHaveBeenCalledWith(
      {
        trayNumber: 1,
        positionNumber: 6,
        inputFiberId: 'a1',
        inputFiberEnd: 'B',
        outputFiberId: 'b1',
        outputFiberEnd: 'A',
        attenuationDb: 0.05,
      },
      expect.any(Function),
    );
    expect(done).toHaveBeenCalled();
  });

  it('shows the server error in the panel and keeps the choices', () => {
    const { fixture, store } = render();
    click(fixture, fiber(fixture, 'in', 'a1'));
    click(fixture, fiber(fixture, 'out', 'b1'));
    store.saveSplice.mockImplementation((_body: unknown, callback: (error: string | null) => void) =>
      callback('A posição 6 desta bandeja já está ocupada.'),
    );
    click(fixture, saveButton(fixture));
    expect(root(fixture).querySelector('[role="alert"]')?.textContent).toContain(
      'A posição 6 desta bandeja já está ocupada.',
    );
    expect(fiber(fixture, 'in', 'a1').getAttribute('aria-pressed')).toBe('true');
  });

  it('rejects an invalid loss without calling the server', () => {
    const { fixture, store } = render();
    click(fixture, fiber(fixture, 'in', 'a1'));
    click(fixture, fiber(fixture, 'out', 'b1'));
    const loss = root(fixture).querySelector<HTMLInputElement>('input[name="perda"]')!;
    loss.value = 'abc';
    loss.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    click(fixture, saveButton(fixture));
    expect(store.saveSplice).not.toHaveBeenCalled();
    expect(root(fixture).querySelector('[role="alert"]')?.textContent).toContain('Perda');
  });

  it('allows both sides on the same cable but never the same fiber', () => {
    const { fixture } = render();
    click(fixture, cableButton(fixture, 'out', 'c1'));
    click(fixture, fiber(fixture, 'in', 'a1'));
    const same = fiber(fixture, 'out', 'a1');
    expect(same.getAttribute('aria-disabled')).toBe('true');
    click(fixture, same);
    expect(hint(fixture)).toBe('Esta fibra está já escolhida do outro lado.');
  });

  it('shows the ends only in advanced mode, and the chosen end changes what is free', () => {
    const { fixture } = render();
    expect(root(fixture).textContent).not.toContain('Ponta A');

    click(fixture, root(fixture).querySelector<HTMLElement>('[data-action="avancado"]')!);
    expect(root(fixture).textContent).toContain('Ponta A');
    click(fixture, column(fixture, 'in').querySelector<HTMLElement>('[data-end="A"]')!);
    expect(fiber(fixture, 'in', 'a2').getAttribute('aria-disabled')).toBe('false');
  });

  it('warns when a cable has no tubes and fibers yet', () => {
    const { fixture } = render(
      fakeBoxStore({ cables: DEFAULT_CABLES, fibers: { c1: [], c2: [] } }),
    );
    const opened = vi.fn();
    fixture.componentInstance.openCable.subscribe(opened);
    expect(column(fixture, 'in').textContent).toContain(
      'Este cabo ainda não tem tubos e fibras. Cadastre na ficha do cabo.',
    );
    click(fixture, column(fixture, 'in').querySelector<HTMLElement>('[data-action="ficha-do-cabo"]')!);
    expect(opened).toHaveBeenCalledWith('c1');
  });
});
