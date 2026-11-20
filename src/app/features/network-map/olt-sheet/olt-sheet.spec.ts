import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { indexFibers } from '../../../core/network/box-interior';
import { groupPortsBySlot } from '../../../core/network/olt-ports';
import { MapElement } from '../../../core/network/map-element';
import { OltSheetComponent } from './olt-sheet';
import { OltSheetStore } from './olt-sheet-store';

const ports = [
  { id: 'p1', slotNumber: 1, portNumber: 1, status: 'FREE' as const },
  { id: 'p2', slotNumber: 1, portNumber: 2, status: 'OCCUPIED' as const, fiberId: 'f1' },
];

const olt: MapElement = {
  key: 'olt:o1',
  kind: 'olt',
  id: 'o1',
  group: 'olt',
  name: 'OLT-CENTRO',
  status: 'ACTIVE',
  position: { lat: 0, lng: 0 },
  details: [],
};

function render(): ComponentFixture<OltSheetComponent> {
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
          cables: signal([
            { cableId: 'c1', name: 'CABO-01', role: 'FEEDER', attachmentRole: 'START', fiberCapacity: 12 },
          ]),
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
  fixture.componentRef.setInput('olt', olt);
  fixture.detectChanges();
  return fixture;
}

function text(fixture: ComponentFixture<OltSheetComponent>): string {
  return (fixture.nativeElement as HTMLElement).textContent ?? '';
}

function clickTab(fixture: ComponentFixture<OltSheetComponent>, id: string): void {
  (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`[data-tab="${id}"]`)!.click();
  fixture.detectChanges();
}

// Primeira renderização com Material pode passar de 5 s com a suíte inteira rodando.
describe('OltSheetComponent', { timeout: 20000 }, () => {
  it('shows the Resumo and Portas PON tabs', () => {
    const fixture = render();
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('[role="tab"]'),
    ).map((tab) => tab.textContent?.trim());
    expect(labels).toEqual(['Resumo', 'Portas PON']);
  });

  it('opens on Resumo with the summary and the cables that leave the OLT', () => {
    const fixture = render();
    expect(text(fixture)).toContain('Esta OLT tem 2 portas PON (1 em uso).');
    expect(text(fixture)).toContain('CABO-01');
    expect(text(fixture)).not.toContain('Nada ligado');
  });

  it('shows the unifilar line with the OLT as the signal source', () => {
    const fixture = render();
    const unifilar = (fixture.nativeElement as HTMLElement).querySelector('app-unifilar-summary')!;
    expect(unifilar.textContent).toContain('Origem do sinal');
    expect(unifilar.querySelector('[role="group"]')!.getAttribute('aria-label')).toContain('Sai: CABO-01');
  });

  it('lists the PON ports by slot with occupancy and what each one feeds', () => {
    const fixture = render();
    clickTab(fixture, 'portas');
    const content = text(fixture);
    expect(content).toContain('Placa 1');
    expect(content).toContain('1/2 ocupadas');
    expect(content).toContain('PON 1');
    expect(content).toContain('Nada ligado');
    expect(content).toContain('Envia sinal por CABO-01, tubo 1 (Verde), fibra 1 (Verde)');
  });

  it('returns to Resumo when another OLT is selected', () => {
    const fixture = render();
    clickTab(fixture, 'portas');
    fixture.componentRef.setInput('olt', { ...olt, id: 'o2', key: 'olt:o2' });
    fixture.detectChanges();
    const resumo = (fixture.nativeElement as HTMLElement).querySelector('[data-tab="resumo"]')!;
    expect(resumo.getAttribute('aria-selected')).toBe('true');
  });
});
