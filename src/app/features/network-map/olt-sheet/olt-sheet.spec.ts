import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { indexFibers } from '../../../core/network/box-interior';
import { groupPortsBySlot } from '../../../core/network/olt-ports';
import { MapElement } from '../../../core/network/map-element';
import { OltSheetComponent } from './olt-sheet';
import { OltSheetStore } from './olt-sheet-store';

const ports = [
  { id: 'p1', slotNumber: 1, portNumber: 1, status: 'FREE' as const },
  { id: 'p2', slotNumber: 1, portNumber: 2, status: 'OCCUPIED' as const, fiberId: 'f1' },
];

function render() {
  TestBed.configureTestingModule({
    imports: [OltSheetComponent],
    providers: [
      {
        provide: OltSheetStore,
        useValue: {
          state: signal('ready'),
          saving: signal(false),
          summary: signal('Esta OLT tem 2 portas PON (1 em uso). 1 cabo sai dela.'),
          slots: signal(groupPortsBySlot(ports)),
          ports: signal(ports),
          cables: signal([{ cableId: 'c1', name: 'CABO-01', role: 'FEEDER' }]),
          fiberIndex: signal(
            indexFibers([
              {
                cableId: 'c1',
                name: 'CABO-01',
                fibers: [{ id: 'f1', tubeNumber: 1, numberInTube: 1, tubeColor: 'GREEN', color: 'GREEN' }],
              },
            ]),
          ),
          reload: vi.fn(),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(OltSheetComponent);
  fixture.componentRef.setInput('olt', {
    key: 'olt:o1',
    kind: 'olt',
    id: 'o1',
    group: 'olt',
    name: 'OLT-CENTRO',
    status: 'ACTIVE',
    position: { lat: 0, lng: 0 },
    details: [],
  } satisfies MapElement);
  fixture.detectChanges();
  return (fixture.nativeElement as HTMLElement).textContent ?? '';
}

// Primeira renderização com Material pode passar de 5 s com a suíte inteira rodando.
describe('OltSheetComponent', { timeout: 20000 }, () => {
  it('lists the PON ports by slot with what each one feeds', () => {
    const text = render();
    expect(text).toContain('Esta OLT tem 2 portas PON (1 em uso).');
    expect(text).toContain('Placa 1');
    expect(text).toContain('PON 1');
    expect(text).toContain('Nada ligado');
    expect(text).toContain('Envia sinal por CABO-01, tubo 1 (Verde), fibra 1 (Verde)');
    expect(text).toContain('CABO-01');
  });
});
