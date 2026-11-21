import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { indexFibers } from '../../../core/network/box-interior';
import { MapElement } from '../../../core/network/map-element';
import { BoxSheetComponent } from './box-sheet';
import { BoxSheetStore } from './box-sheet-store';

function fakeStore(overrides: Record<string, unknown> = {}) {
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
    servicePorts: signal([
      { id: 'sv1', portNumber: 1, customerId: 'k1', splitterPortId: 'o2', status: 'OCCUPIED' },
    ]),
    customers: signal(new Map([['k1', { id: 'k1', name: 'Maria' }]])),
    fiberIndex: signal(new Map()),
    reload: vi.fn(),
    ...overrides,
  };
}

const BOX: MapElement = {
  key: 'box:b1',
  kind: 'box',
  id: 'b1',
  group: 'CTO',
  name: 'CAIXA-01',
  status: 'ACTIVE',
  position: { lat: 0, lng: 0 },
  details: [],
};

function render(
  group: MapElement['group'],
  overrides: Record<string, unknown> = {},
): ComponentFixture<BoxSheetComponent> {
  TestBed.configureTestingModule({
    imports: [BoxSheetComponent],
    providers: [{ provide: BoxSheetStore, useValue: fakeStore(overrides) }],
  });
  const fixture = TestBed.createComponent(BoxSheetComponent);
  fixture.componentRef.setInput('box', { ...BOX, group } satisfies MapElement);
  fixture.detectChanges();
  return fixture;
}

function text(fixture: ComponentFixture<BoxSheetComponent>): string {
  return (fixture.nativeElement as HTMLElement).textContent ?? '';
}

function clickTab(fixture: ComponentFixture<BoxSheetComponent>, id: string): void {
  (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`[data-tab="${id}"]`)!.click();
  fixture.detectChanges();
}

function tabLabels(fixture: ComponentFixture<BoxSheetComponent>): string[] {
  return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[role="tab"]')).map(
    (tab) => tab.textContent?.trim() ?? '',
  );
}

function selected(fixture: ComponentFixture<BoxSheetComponent>, id: string): string | null {
  return (fixture.nativeElement as HTMLElement)
    .querySelector(`[data-tab="${id}"]`)!
    .getAttribute('aria-selected');
}

// Primeira renderização com Material pode passar de 5 s com a suíte inteira rodando.
describe('BoxSheetComponent', { timeout: 20000 }, () => {
  it('Ver impacto no cabeçalho pede o impacto desta caixa', () => {
    const fixture = render('CTO');
    let emitted = 0;
    fixture.componentInstance.impact.subscribe(() => emitted++);
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[data-impact]')!.click();
    expect(emitted).toBe(1);
  });

  it('Rastrear no cabeçalho emite o pedido de rastreio da caixa', () => {
    const fixture = render('CTO');
    let emitted = 0;
    fixture.componentInstance.trace.subscribe(() => emitted++);

    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[data-trace-box]')!.click();
    expect(emitted).toBe(1);
  });

  it('Rastrear em cada splitter emite o id dele', () => {
    const fixture = render('CEO');
    clickTab(fixture, 'splitters');
    let ids: string[] = [];
    fixture.componentInstance.traceSplitter.subscribe((id) => ids.push(id));

    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[data-trace-splitter]')!.click();
    expect(ids).toEqual(['sp1']);
  });

  it('opens a CTO on Resumo, without Fusões when there is no tray or connector', () => {
    const fixture = render('CTO');
    expect(tabLabels(fixture)).toEqual(['Resumo', 'Portas']);
    expect(selected(fixture, 'resumo')).toBe('true');

    clickTab(fixture, 'portas');
    const content = text(fixture);
    expect(content).toContain('Saída 1 → livre');
    expect(content).toContain('Saída 2 → Porta de atendimento 1 (Maria)');
    expect(content).toContain('Recebe sinal do Splitter 1:2 (balanceado), saída 2');
    expect(content).toContain('1/2 saídas em uso');
    expect(content).toContain('1/1 ocupadas');
  });

  it('gives a CEO Resumo, Fusões and Splitters, and no service ports', () => {
    const fixture = render('CEO');
    expect(tabLabels(fixture)).toEqual(['Resumo', 'Fusões', 'Splitters']);

    clickTab(fixture, 'splitters');
    expect(text(fixture)).not.toContain('Portas de atendimento');
  });

  it('does not show 0/0 in an empty box', () => {
    const fixture = render('CEO', { splitters: signal([]) });
    clickTab(fixture, 'fusoes');
    const content = text(fixture);
    expect(content).toContain('Nenhuma bandeja cadastrada');
    expect(content).toContain('Nenhuma ligação por conector.');
    expect(content).not.toContain('0/0');
  });

  it('summarizes the splices and opens the splice screen instead of listing them', () => {
    const fixture = render('CEO', {
      trays: signal([
        { id: 't1', trayNumber: 1, capacity: 12, usedPositions: 1 },
        { id: 't2', trayNumber: 2, capacity: 12, usedPositions: 0 },
      ]),
      splices: signal([{ id: 's1', trayNumber: 1, positionNumber: 1, inputFiberId: 'f1', outputFiberId: 'f2' }]),
    });
    const opened = vi.fn();
    fixture.componentInstance.openSplices.subscribe(opened);

    clickTab(fixture, 'fusoes');
    const root = fixture.nativeElement as HTMLElement;
    expect(text(fixture)).toContain('1 fusão em 2 bandejas');
    expect(text(fixture)).not.toContain('Nova fusão');
    expect(root.querySelectorAll('.box__splice app-diagram-line').length).toBe(0);

    root.querySelector<HTMLElement>('[data-action="ver-fusoes"]')!.click();
    expect(opened).toHaveBeenCalled();
  });

  it('offers "Ver fusões" on the Resumo of a CTO without trays', () => {
    const fixture = render('CTO');
    const button = (fixture.nativeElement as HTMLElement).querySelector('[data-action="ver-fusoes"]');
    expect(button?.textContent).toContain('Ver fusões');
  });

  it('draws one diagram line per connector, naming a fiber from another cable', () => {
    const fixture = render('CEO', {
      connectors: signal([{ id: 'k1', type: 'CONNECTOR', fiberAId: 'f1', fiberBId: 'zz' }]),
      fiberIndex: signal(
        indexFibers([
          {
            cableId: 'c1',
            name: 'CABO-01',
            fibers: [{ id: 'f1', tubeNumber: 1, tubeColor: 'GREEN', numberInTube: 3, color: 'WHITE' }],
          },
        ]),
      ),
    });

    clickTab(fixture, 'fusoes');
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('app-diagram-line').length).toBe(1);
    const content = text(fixture);
    expect(content).toContain('CABO-01');
    expect(content).toContain('Fibra de outro cabo');
    expect(content).toContain('Conector');
  });

  it('shows the unifilar line at the top', () => {
    const fixture = render('CTO', {
      cables: signal([
        { cableId: 'c1', name: 'CABO-01', attachmentRole: 'END', fiberCapacity: 12 },
        { cableId: 'c2', name: 'CABO-02', attachmentRole: 'START', fiberCapacity: 6 },
      ]),
    });

    const group = (fixture.nativeElement as HTMLElement).querySelector(
      'app-unifilar-summary [role="group"]',
    );
    const label = group?.getAttribute('aria-label') ?? '';
    expect(label).toContain('Chega: CABO-01 · 12 fibras');
    expect(label).toContain('Sai: CABO-02 · 6 fibras');
  });

  it('goes back to Resumo when another box is opened', () => {
    const fixture = render('CTO');
    clickTab(fixture, 'portas');
    expect(selected(fixture, 'portas')).toBe('true');

    fixture.componentRef.setInput('box', { ...BOX, id: 'b2', key: 'box:b2' } satisfies MapElement);
    fixture.detectChanges();
    expect(selected(fixture, 'resumo')).toBe('true');
  });

  it('shows the port status as a colored dot, not colored text', () => {
    const fixture = render('CTO');
    clickTab(fixture, 'portas');

    const chip = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.sheet__chip')!;
    expect(chip.style.getPropertyValue('--gf-chip-color')).not.toBe('');
    expect(chip.style.color).toBe('');
  });

  it('turns "Editar dados" into an icon button shown only when editing is allowed', () => {
    const fixture = render('CTO');
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('button[aria-label="Editar dados"]')).toBeTruthy();

    fixture.componentRef.setInput('canEdit', false);
    fixture.detectChanges();
    expect(root.querySelector('button[aria-label="Editar dados"]')).toBeFalsy();
  });
});
