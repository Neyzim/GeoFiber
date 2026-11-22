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
  return (root(fixture).textContent ?? '').replace(/\s+/g, ' ');
}

function click(fixture: Fixture, selector: string): void {
  root(fixture).querySelector<HTMLElement>(selector)!.click();
  fixture.detectChanges();
}

/** Chama o `done` que a página passou ao store. */
function finishSplice(store: FakeBoxStore, error: string | null, spliceId?: string) {
  const done = store.spliceFibers.mock.calls[0][2] as (error: string | null, id?: string) => void;
  done(error, spliceId);
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

  it('lista as fibras do primeiro cabo que chega com o destino', () => {
    const { fixture } = render();
    expect(root(fixture).querySelector('[data-cable-tab="c1"]')?.getAttribute('aria-selected')).toBe('true');
    expect(root(fixture).querySelector('[data-fiber="a2"]')?.textContent).toContain('→ CABO-02 · Verde 3');
    expect(root(fixture).querySelector('[data-fiber="a1"]')?.textContent).toContain('livre');
  });

  it('tocar numa fibra abre a gaveta; Fechar fecha', () => {
    const { fixture } = render();
    click(fixture, '[data-fiber="a1"]');
    expect(text(fixture)).toContain('Esta fibra está livre nesta caixa.');
    click(fixture, '[data-action="fechar"]');
    expect(root(fixture).querySelector('app-fiber-drawer')).toBeNull();
  });

  it('emendar: Emendar → escolhe na aba do outro cabo → confirma e chama spliceFibers com bandeja e pontas', () => {
    const { fixture, store } = render();
    click(fixture, '[data-fiber="a1"]');
    click(fixture, '[data-action="emendar"]');
    expect(text(fixture)).toContain('Escolha a fibra que vai emendar com CABO-01 · 1 Verde');
    expect(root(fixture).querySelector('[data-cable-tab="c2"]')?.getAttribute('aria-selected')).toBe('true');
    expect(root(fixture).querySelector<HTMLButtonElement>('[data-fiber="b3"]')!.disabled).toBe(true);

    click(fixture, '[data-fiber="b1"]');
    expect(text(fixture)).toContain('Nova emenda');
    expect(text(fixture)).toContain('Vai para a bandeja 1, na próxima posição livre.');
    click(fixture, '[data-action="confirmar"]');
    expect(store.spliceFibers).toHaveBeenCalledWith(
      { kind: 'existing', trayNumber: 1 },
      { inputFiberId: 'a1', inputFiberEnd: 'B', outputFiberId: 'b1', outputFiberEnd: 'A' },
      expect.any(Function),
    );
  });

  it('após emendar, a gaveta mostra a emenda nova', () => {
    const { fixture, store } = render();
    click(fixture, '[data-fiber="a1"]');
    click(fixture, '[data-action="emendar"]');
    click(fixture, '[data-fiber="b1"]');
    click(fixture, '[data-action="confirmar"]');
    finishSplice(store, null, 's1');
    fixture.detectChanges();
    expect(text(fixture)).not.toContain('Escolha a fibra');
    expect(text(fixture)).toContain('Posição 2 · Bandeja 1');
  });

  it('erro ao emendar aparece na gaveta e mantém a escolha', () => {
    const { fixture, store } = render();
    click(fixture, '[data-fiber="a1"]');
    click(fixture, '[data-action="emendar"]');
    click(fixture, '[data-fiber="b1"]');
    click(fixture, '[data-action="confirmar"]');
    finishSplice(store, 'A bandeja 1 está cheia.');
    fixture.detectChanges();
    expect(root(fixture).querySelector('[role="alert"]')?.textContent).toContain('A bandeja 1 está cheia.');
    expect(text(fixture)).toContain('Nova emenda');
  });

  it('Cancelar sai do modo escolher sem chamar nada', () => {
    const { fixture, store } = render();
    click(fixture, '[data-fiber="a1"]');
    click(fixture, '[data-action="emendar"]');
    click(fixture, '[data-action="cancelar-escolha"]');
    expect(text(fixture)).not.toContain('Escolha a fibra');
    expect(root(fixture).querySelector<HTMLButtonElement>('[data-fiber="b3"]')?.disabled ?? false).toBe(false);
    expect(store.spliceFibers).not.toHaveBeenCalled();
  });

  it('rodapé das bandejas: ocupação e Excluir só na bandeja vazia', () => {
    const { fixture, store } = render();
    expect(text(fixture)).toContain('Bandeja 1 · 1/6');
    expect(text(fixture)).toContain('Bandeja 2 · 0/12');
    expect(root(fixture).querySelector('[data-tray-delete="1"]')).toBeNull();
    click(fixture, '[data-tray-delete="2"]');
    expect(store.deleteTray).toHaveBeenCalledWith('t2');
  });

  it('caixa sem cabos mostra a frase e Voltar ao mapa', () => {
    const { fixture } = render({ store: fakeBoxStore({ cables: [], fibers: {} }) });
    expect(text(fixture)).toContain('Nenhum cabo chega aqui ainda.');
    expect(root(fixture).querySelector('[data-action="voltar-ao-mapa"]')).toBeTruthy();
  });

  it('sem permissão: sem Emendar nem Excluir', () => {
    const { fixture } = render({ canEdit: false });
    click(fixture, '[data-fiber="a1"]');
    expect(root(fixture).querySelector('[data-action="emendar"]')).toBeNull();
    expect(root(fixture).querySelector('[data-tray-delete]')).toBeNull();
    click(fixture, '[data-fiber="a2"]');
    expect(root(fixture).querySelector('[data-action="excluir-emenda"]')).toBeNull();
  });

  it('desfazer a emenda pede confirmação e exclui', () => {
    const { fixture, store } = render();
    click(fixture, '[data-fiber="a2"]');
    click(fixture, '[data-action="excluir-emenda"]');
    expect(store.deleteSplice).toHaveBeenCalledWith('s1');
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
    expect(mapReturn.take()).toEqual({ selection: { type: 'element', key: 'box:b1' }, focus: false });
  });

  it('shows a cable on the map from the splice card', () => {
    const { fixture, router, mapReturn } = render();
    click(fixture, '[data-fiber="a2"]');
    click(fixture, '[data-cable="c2"]');
    expect(mapReturn.take()).toEqual({ selection: { type: 'cable', id: 'c2' }, focus: true });
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('Ver o caminho de uma emenda abre o rastreio no mapa', () => {
    const { fixture, router } = render();
    click(fixture, '[data-fiber="a2"]');
    click(fixture, '[data-trace-splice]');
    expect(router.navigate).toHaveBeenCalledWith(['/'], { queryParams: { trace: 'SPLICE:s1' } });
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
