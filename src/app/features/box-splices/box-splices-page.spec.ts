import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { NetworkMapState } from '../../core/network/network-map-state';
import { MapReturnService } from '../../core/services/map-return';
import { BoxSheetStore } from '../network-map/box-sheet/box-sheet-store';
import { FakeBoxStore, fakeBoxStore } from '../../../testing/box-splices-fixtures';
import { BoxSplicesPage } from './box-splices-page';

interface Setup {
  store?: FakeBoxStore;
  canEdit?: boolean;
  selection?: unknown;
  confirm?: boolean;
}

function render(options: Setup = {}) {
  const store = options.store ?? fakeBoxStore();
  const router = { navigate: vi.fn(() => Promise.resolve(true)) };
  const dialog = { open: vi.fn(() => ({ afterClosed: () => of(options.confirm ?? true) })) };
  const mapState = {
    canEdit: signal(options.canEdit ?? true),
    selection: signal(options.selection ?? null),
  };
  TestBed.configureTestingModule({
    imports: [BoxSplicesPage],
    providers: [
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ boxId: 'b1' })) } },
      { provide: Router, useValue: router },
      { provide: NetworkMapState, useValue: mapState },
    ],
  });
  TestBed.overrideComponent(BoxSplicesPage, {
    set: {
      providers: [
        { provide: BoxSheetStore, useValue: store },
        { provide: MatDialog, useValue: dialog },
      ],
    },
  });
  const fixture = TestBed.createComponent(BoxSplicesPage);
  fixture.detectChanges();
  return { fixture, store, router, dialog, mapReturn: TestBed.inject(MapReturnService) };
}

type Fixture = ComponentFixture<BoxSplicesPage>;

function root(fixture: Fixture): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function text(fixture: Fixture): string {
  return root(fixture).textContent ?? '';
}

function click(fixture: Fixture, selector: string): void {
  root(fixture).querySelector<HTMLElement>(selector)!.click();
  fixture.detectChanges();
}

function tabs(fixture: Fixture): string[] {
  return Array.from(root(fixture).querySelectorAll('[data-tray-tab]')).map(
    (tab) => tab.textContent?.trim() ?? '',
  );
}

describe('BoxSplicesPage', { timeout: 20000 }, () => {
  it('opens the box of the address and shows its name, type and status', () => {
    const { fixture, store } = render();
    expect(store.open).toHaveBeenCalledWith('b1');
    const header = root(fixture).querySelector('header')!.textContent ?? '';
    expect(header).toContain('CEO-07');
    expect(header).toContain('CEO');
    expect(header).toContain('Ativo');
  });

  it('shows one tab per tray with its occupancy', () => {
    const { fixture } = render();
    expect(tabs(fixture)).toEqual(['Bandeja 1 · 1/6', 'Bandeja 2 · 0/12']);
    expect(root(fixture).querySelectorAll('[data-position]').length).toBe(6);

    click(fixture, '[data-tray-tab="2"]');
    expect(root(fixture).querySelectorAll('[data-position]').length).toBe(12);
  });

  it('opens the fiber choice on an empty position and the splice card on a used one', () => {
    const { fixture } = render();
    click(fixture, '[data-position="1"]');
    expect(root(fixture).querySelector('app-splice-picker')).toBeTruthy();
    expect(text(fixture)).toContain('Emenda na posição 1 · Bandeja 1');

    click(fixture, '[data-position="2"]');
    expect(root(fixture).querySelector('app-splice-picker')).toBeNull();
    expect(text(fixture)).toContain('Posição 2 · Bandeja 1');
  });

  it('closes the card when the splice is gone after deleting it', () => {
    const { fixture, store } = render();
    click(fixture, '[data-position="2"]');
    click(fixture, '[data-action="excluir-emenda"]');
    expect(store.deleteSplice).toHaveBeenCalledWith('s1');

    store.splices.set([]);
    fixture.detectChanges();
    expect(root(fixture).querySelector('app-splice-detail')).toBeNull();
  });

  it('creates a tray with the chosen capacity and deletes an empty one', () => {
    const { fixture, store } = render();
    click(fixture, '[data-action="nova-bandeja"]');
    click(fixture, '[data-capacity="24"]');
    expect(store.addTray).toHaveBeenCalledWith(24);

    expect(root(fixture).querySelector('[data-action="excluir-bandeja"]')).toBeNull();
    click(fixture, '[data-tray-tab="2"]');
    click(fixture, '[data-action="excluir-bandeja"]');
    expect(store.deleteTray).toHaveBeenCalledWith('t2');
  });

  it('invites to create the first tray when there is none', () => {
    const { fixture, store } = render({ store: fakeBoxStore({ trays: [], splices: [] }) });
    expect(text(fixture)).toContain('Esta caixa ainda não tem bandejas.');
    click(fixture, '[data-action="nova-bandeja"]');
    click(fixture, '[data-capacity="12"]');
    expect(store.addTray).toHaveBeenCalledWith(12);
  });

  it('only reads without edit permission', () => {
    const { fixture } = render({ canEdit: false });
    expect(root(fixture).querySelector('[data-action="nova-bandeja"]')).toBeNull();
    expect(text(fixture)).not.toContain('emendar aqui');
    click(fixture, '[data-position="2"]');
    expect(root(fixture).querySelector('[data-action="excluir-emenda"]')).toBeNull();
    click(fixture, '[data-tray-tab="2"]');
    expect(root(fixture).querySelector('[data-action="excluir-bandeja"]')).toBeNull();
  });

  it('goes back to the map with the box selected, centering it when it was not selected', () => {
    const { fixture, router, mapReturn } = render();
    click(fixture, '[data-action="voltar"]');
    expect(mapReturn.take()).toEqual({
      selection: { type: 'element', key: 'box:b1' },
      focus: true,
    });
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('keeps the map position when the box was already selected', () => {
    const { fixture, mapReturn } = render({ selection: { type: 'element', key: 'box:b1' } });
    click(fixture, '[data-action="voltar"]');
    expect(mapReturn.take()?.focus).toBe(false);
  });

  it('shows a cable on the map from the splice card', () => {
    const { fixture, router, mapReturn } = render();
    click(fixture, '[data-position="2"]');
    click(fixture, '[data-cable="c2"]');
    expect(mapReturn.take()).toEqual({ selection: { type: 'cable', id: 'c2' }, focus: true });
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('offers to retry or go back when the box cannot be loaded', () => {
    const store = fakeBoxStore();
    store.state.set('error');
    store.overview.set(null);
    const { fixture } = render({ store });
    expect(text(fixture)).toContain('Não foi possível carregar a caixa.');
    click(fixture, '[data-action="tentar-de-novo"]');
    expect(store.reload).toHaveBeenCalled();
    expect(root(fixture).querySelector('[data-action="voltar-ao-mapa"]')).toBeTruthy();
  });
});
