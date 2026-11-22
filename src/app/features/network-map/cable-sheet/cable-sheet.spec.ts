import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { CableSheetComponent } from './cable-sheet';
import { CableSheetStore } from './cable-sheet-store';
import type { MapCable } from '../../../core/network/map-element';

const fakeCable = (): MapCable => ({
  id: 'c1',
  name: 'CABO-01',
  role: 'FEEDER',
  status: 'ACTIVE',
  points: [],
  fiberCapacity: 2,
  lengthMeters: null,
  details: [],
});

function fakeStore() {
  return {
    state: signal('ready'),
    route: signal('Sai da OLT-1 e chega na CTO-2.'),
    routeItems: signal([
      { ref: { kind: 'olt' as const, id: 'o1' }, name: 'OLT-1' },
      { ref: { kind: 'box' as const, id: 'b2' }, name: 'CTO-2' },
    ]),
    editing: signal(false),
    draft: signal([]),
    picking: signal(false),
    saving: signal(false),
    tubes: signal([
      {
        id: 't1',
        tubeNumber: 1,
        capacity: 2,
        color: 'GREEN' as const,
        fibers: [
          { id: 'f1', numberInTube: 1, absoluteNumber: 1, color: 'GREEN' as const, status: 'OCCUPIED' as const, ends: [] },
          { id: 'f2', numberInTube: 2, absoluteNumber: 2, color: 'YELLOW' as const, status: 'AVAILABLE' as const, ends: [] },
        ],
      },
    ]),
    fiberCount: signal(2),
    reload: vi.fn(),
  };
}

describe('CableSheetComponent', { timeout: 20000 }, () => {
  let fixture: ComponentFixture<CableSheetComponent>;

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function clickTab(id: string): void {
    const tab = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(`[data-tab="${id}"]`);
    tab!.click();
    fixture.detectChanges();
  }

  function unifilar(): HTMLElement {
    return (fixture.nativeElement as HTMLElement).querySelector('app-unifilar-summary .unifilar')!;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CableSheetComponent],
      providers: [{ provide: CableSheetStore, useValue: fakeStore() }],
    }).compileComponents();

    fixture = TestBed.createComponent(CableSheetComponent);
    fixture.componentRef.setInput('cable', fakeCable());
    fixture.componentRef.setInput('canEdit', true);
    fixture.detectChanges();
  });

  it('shows the Resumo and Fibras tabs', () => {
    const tabs = (fixture.nativeElement as HTMLElement).querySelectorAll('[role="tab"]');
    expect(Array.from(tabs).map((tab) => tab.textContent?.trim())).toEqual(['Resumo', 'Fibras']);
  });

  it('Resumo shows the route and the unifilar line from first to last element', () => {
    expect(text()).toContain('Sai da OLT-1 e chega na CTO-2.');
    const label = unifilar().getAttribute('aria-label');
    expect(label).toContain('Chega: OLT-1');
    expect(label).toContain('Sai: CTO-2');
  });

  it('a planned cable draws a dashed line', () => {
    fixture.componentRef.setInput('cable', { ...fakeCable(), status: 'PLANNED' });
    fixture.detectChanges();
    const line = unifilar().querySelector('line');
    expect(line?.getAttribute('stroke-dasharray')).toBe('4 4');
  });

  it('Ver impacto no cabeçalho pede o impacto deste cabo', () => {
    let emitted = 0;
    fixture.componentInstance.impact.subscribe(() => emitted++);
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[data-impact]')!.click();
    expect(emitted).toBe(1);
  });

  it('Rastrear numa fibra emite o id dela', () => {
    clickTab('fibras');
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.sheet__tube-head')!.click();
    fixture.detectChanges();
    let ids: string[] = [];
    fixture.componentInstance.traceFiber.subscribe((id) => ids.push(id));

    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[data-trace-fiber]')!.click();
    expect(ids).toEqual(['f1']);
  });

  it('"Mais ações" → "Excluir" pede a exclusão do cabo; sem permissão, não há o menu', async () => {
    let removed = 0;
    fixture.componentInstance.remove.subscribe(() => removed++);
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('button[aria-label="Mais ações"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    document.querySelector<HTMLElement>('[data-action="excluir"]')!.click();
    expect(removed).toBe(1);

    fixture.componentRef.setInput('canEdit', false);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('button[aria-label="Mais ações"]')).toBeFalsy();
  });

  it('Fibras shows tube occupancy and ABNT color dots', () => {
    clickTab('fibras');
    expect(text()).toContain('1/2 em uso');
    const head = (fixture.nativeElement as HTMLElement).querySelector('.sheet__tube-head');
    expect(head?.querySelectorAll('app-fiber-dot').length).toBeGreaterThan(0);
  });
});
