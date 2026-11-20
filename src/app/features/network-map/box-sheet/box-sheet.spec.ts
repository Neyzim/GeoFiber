import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MapElement } from '../../../core/network/map-element';
import { BoxSheetComponent } from './box-sheet';
import { BoxSheetStore } from './box-sheet-store';

function fakeStore() {
  const empty = signal([]);
  return {
    state: signal('ready'),
    overview: signal({ box: { id: 'b1' } }),
    summary: signal('Nada foi registrado dentro desta caixa ainda.'),
    saving: signal(false),
    cables: empty,
    trays: empty,
    splices: empty,
    connectors: empty,
    splitters: signal([
      {
        id: 'sp1',
        ratio: 'RATIO_1_2',
        balanced: true,
        ports: [
          { id: 'in', portNumber: 1, direction: 'INPUT' },
          { id: 'o1', portNumber: 2, direction: 'OUTPUT' },
          { id: 'o2', portNumber: 3, direction: 'OUTPUT', servicePortId: 'sv1' },
        ],
      },
    ]),
    servicePorts: signal([{ id: 'sv1', portNumber: 1, customerId: 'k1', splitterPortId: 'o2' }]),
    customers: signal(new Map([['k1', { id: 'k1', name: 'Maria' }]])),
    fiberIndex: signal(new Map()),
    reload: vi.fn(),
  };
}

function render(group: MapElement['group']) {
  TestBed.configureTestingModule({
    imports: [BoxSheetComponent],
    providers: [{ provide: BoxSheetStore, useValue: fakeStore() }],
  });
  const fixture = TestBed.createComponent(BoxSheetComponent);
  fixture.componentRef.setInput('box', {
    key: 'box:b1',
    kind: 'box',
    id: 'b1',
    group,
    name: 'CAIXA-01',
    status: 'ACTIVE',
    position: { lat: 0, lng: 0 },
    details: [],
  } satisfies MapElement);
  fixture.detectChanges();
  return (fixture.nativeElement as HTMLElement).textContent ?? '';
}

// Primeira renderização com Material pode passar de 5 s com a suíte inteira rodando.
describe('BoxSheetComponent', { timeout: 20000 }, () => {
  it('shows service ports and the customer behind each splitter output in a CTO', () => {
    const text = render('CTO');
    expect(text).toContain('Portas de atendimento');
    expect(text).not.toContain('Bandejas e fusões');
    expect(text).toContain('Saída 1 → livre');
    expect(text).toContain('Saída 2 → Porta de atendimento 1 (Maria)');
    expect(text).toContain('Recebe sinal do Splitter 1:2 (balanceado), saída 2');
  });

  it('shows trays and connectors, without service ports, in a CEO', () => {
    const text = render('CEO');
    expect(text).toContain('Bandejas e fusões');
    expect(text).toContain('Conectores');
    expect(text).not.toContain('Portas de atendimento');
  });
});
