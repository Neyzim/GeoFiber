import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FiberDestination } from '../../core/network/fiber-destinations';
import { BoxSheetStore } from '../network-map/box-sheet/box-sheet-store';
import { DEFAULT_SPLICES, fakeBoxStore } from '../../../testing/box-splices-fixtures';
import { B1, F1, F2, SPLITTER, row } from '../../../testing/fiber-diagram-fixtures';
import { FiberDrawerComponent } from './fiber-drawer';

describe('FiberDrawerComponent', { timeout: 20000 }, () => {
  let fixture: ComponentFixture<FiberDrawerComponent>;

  function render(inputs: Record<string, unknown>) {
    TestBed.configureTestingModule({
      imports: [FiberDrawerComponent],
      providers: [{ provide: BoxSheetStore, useValue: fakeBoxStore() }],
    });
    fixture = TestBed.createComponent(FiberDrawerComponent);
    fixture.componentRef.setInput('canEdit', true);
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    fixture.detectChanges();
  }

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => el().textContent?.replace(/\s+/g, ' ') ?? '';
  const free = (destination: FiberDestination) => row(F2, destination);

  it('fibra livre: frase e Emendar (só com canEdit)', () => {
    render({ row: free({ kind: 'free', text: 'livre' }) });
    expect(text()).toContain('Esta fibra está livre nesta caixa.');
    let started = 0;
    fixture.componentInstance.startSplice.subscribe(() => started++);
    el().querySelector<HTMLElement>('[data-action="emendar"]')!.click();
    expect(started).toBe(1);

    fixture.componentRef.setInput('canEdit', false);
    fixture.detectChanges();
    expect(el().querySelector('[data-action="emendar"]')).toBeNull();
  });

  it('passa direto: frase própria e Emendar', () => {
    render({ row: free({ kind: 'pass-through', text: 'passa direto' }) });
    expect(text()).toContain('Esta fibra passa direto pela caixa, sem emenda.');
    expect(el().querySelector('[data-action="emendar"]')).not.toBeNull();
  });

  it('fibra emendada mostra o cartão da emenda (bandeja e posição)', () => {
    render({
      row: row(F1, { kind: 'splice', spliceId: 's1', otherFiberId: 'c2f1', text: '→ BACKBONE · Verde 1' }),
      splice: DEFAULT_SPLICES[0],
    });
    expect(el().querySelector('app-splice-detail')).not.toBeNull();
    expect(text()).toContain('Posição 2 · Bandeja 1');
  });

  it('fibra no splitter: desenho e grade de saídas com cliente', () => {
    render({ row: row(F2, { kind: 'splitter-in', splitterId: 'sp1', text: '→ Splitter 1:16' }), splitter: SPLITTER });
    expect(text()).toContain('Splitter 1:16');
    expect(text()).toContain('Maria');
    const traces: unknown[] = [];
    fixture.componentInstance.trace.subscribe((t) => traces.push(t));
    el().querySelector<HTMLElement>('[data-action="caminho"]')!.click();
    expect(traces).toEqual([{ kind: 'FIBER', id: 'c1f2' }]);
  });

  it('aba Splitters: entrada e grade de saídas; Ver o caminho (SPLITTER)', () => {
    render({ splitter: SPLITTER });
    expect(text()).toContain('Entrada: CABO-01 · Verde 2');
    expect(el().querySelectorAll('[data-output]').length).toBe(2);
    const traces: unknown[] = [];
    fixture.componentInstance.trace.subscribe((t) => traces.push(t));
    el().querySelector<HTMLElement>('[data-action="caminho"]')!.click();
    expect(traces).toEqual([{ kind: 'SPLITTER', id: 'sp1' }]);
  });

  it('conector e porta de atendimento: desenho, frase e Ver o caminho (FIBER)', () => {
    render({ row: row(F2, { kind: 'service-port', servicePortId: 'p1', text: '→ porta 1 · Maria' }) });
    expect(text()).toContain('Vai para a porta 1 · Maria');
    expect(el().querySelector('[data-action="caminho"]')).not.toBeNull();

    fixture.componentRef.setInput('row', row(F2, { kind: 'connector', connectionId: 'x', otherFiberId: 'c2f1', text: '→ conector' }));
    fixture.componentRef.setInput('fiberIndex', new Map([['c2f1', B1]]));
    fixture.detectChanges();
    expect(text()).toContain('Ligada por conector');
    expect(text()).toContain('BACKBONE');
  });

  it('emenda pendente: desenho, frase da bandeja, Emendar e Cancelar', () => {
    render({ pending: { from: row(F2, { kind: 'free', text: 'livre' }), to: row(B1, { kind: 'pass-through', text: 'passa direto' }, 'A'), choice: { kind: 'create', trayNumber: 2, capacity: 12 } } });
    expect(text()).toContain('Nova emenda');
    expect(text()).toContain('Vou criar a bandeja 2 (12 posições).');
    let confirmed = 0;
    let cancelled = 0;
    fixture.componentInstance.confirm.subscribe(() => confirmed++);
    fixture.componentInstance.cancel.subscribe(() => cancelled++);
    el().querySelector<HTMLElement>('[data-action="confirmar"]')!.click();
    el().querySelector<HTMLElement>('[data-action="cancelar"]')!.click();
    expect([confirmed, cancelled]).toEqual([1, 1]);

    fixture.componentRef.setInput('saving', true);
    fixture.detectChanges();
    expect(el().querySelector<HTMLButtonElement>('[data-action="confirmar"]')!.disabled).toBe(true);

    fixture.componentRef.setInput('saving', false);
    fixture.componentRef.setInput('pending', { from: row(F2, { kind: 'free', text: 'livre' }), to: row(B1, { kind: 'free', text: 'livre' }), choice: { kind: 'full' } });
    fixture.detectChanges();
    expect(el().querySelector<HTMLButtonElement>('[data-action="confirmar"]')!.disabled).toBe(true);
    expect(text()).toContain('Esta caixa não comporta mais bandejas.');
  });

  it('mostra o erro do servidor na própria gaveta', () => {
    render({ row: free({ kind: 'free', text: 'livre' }), error: 'A bandeja 1 está cheia.' });
    expect(el().querySelector('[role="alert"]')?.textContent).toContain('A bandeja 1 está cheia.');
  });

  it('rompida, reservada e em outra caixa: só a frase, sem ações', () => {
    render({ row: free({ kind: 'broken', text: 'rompida' }) });
    expect(text()).toContain('Esta fibra está rompida.');
    expect(el().querySelector('[data-action]:not([data-action="fechar"])')).toBeNull();

    fixture.componentRef.setInput('row', free({ kind: 'elsewhere', text: 'em outra caixa' }));
    fixture.detectChanges();
    expect(text()).toContain('Esta fibra está em outra caixa.');
    expect(el().querySelector('[data-action]:not([data-action="fechar"])')).toBeNull();
  });
});
