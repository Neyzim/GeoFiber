import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { groupPlacemarks, type ImportGroup, type ImportTarget } from '../../core/import/import-groups';
import type { KmlPlacemark } from '../../core/import/kml-reader';
import type { ImportMatch } from '../../core/import/import-match';
import type { ImportChoices } from '../../core/import/import-request';
import { NetworkImportStore } from './network-import-store';
import { ImportGroupRowComponent } from './import-group-row';

const pointItem = (i: number, name: string): KmlPlacemark => ({
  ref: `p-${i}`,
  name,
  description: '',
  folderPath: ['CTOs'],
  geometry: { kind: 'point', point: { lat: -10.65 - i * 0.001, lng: -51.57 } },
  style: { iconHref: 'files/cto.png', iconColor: '#ff8800' },
});

const lineItem = (): KmlPlacemark => ({
  ref: 'l-1',
  name: 'Tronco',
  description: '',
  folderPath: ['Rede'],
  geometry: {
    kind: 'line',
    points: [
      { lat: -10.65, lng: -51.57 },
      { lat: -10.66, lng: -51.58 },
    ],
  },
  style: { lineColor: '#ff0000', lineWidth: 3 },
});

interface Setup {
  placemarks?: KmlPlacemark[];
  groupTarget?: ImportTarget | null;
  itemTargets?: Record<string, ImportTarget>;
  matches?: Record<string, ImportMatch>;
  moves?: string[];
  groupIndex?: number;
}

function render(setup: Setup = {}) {
  const placemarks = setup.placemarks ?? [pointItem(1, 'CTO-001'), pointItem(2, 'CTO-002'), pointItem(3, 'CEO-07')];
  const groups = groupPlacemarks(placemarks);
  const group: ImportGroup = groups[setup.groupIndex ?? 0];
  const choices = signal<ImportChoices>({
    groups: new Map([[group.key, { target: setup.groupTarget === undefined ? 'CTO' : setup.groupTarget, fiberCapacity: 12 }]]),
    items: new Map(Object.entries(setup.itemTargets ?? {})),
    moves: new Set(setup.moves ?? []),
    usageStatus: 'INSTALLED',
    linkCableEnds: true,
  });
  const matches = signal(new Map(Object.entries(setup.matches ?? {})));
  const store = {
    choices,
    matches,
    icons: signal(new Map<string, string>()),
    setGroupTarget: vi.fn(),
    setGroupFibers: vi.fn(),
    setItemTarget: vi.fn(),
    setMove: vi.fn(),
  };
  TestBed.configureTestingModule({
    imports: [ImportGroupRowComponent],
    providers: [{ provide: NetworkImportStore, useValue: store }],
  });
  const fixture: ComponentFixture<ImportGroupRowComponent> = TestBed.createComponent(ImportGroupRowComponent);
  fixture.componentRef.setInput('group', group);
  fixture.detectChanges();
  return { fixture, store, group };
}

function root(fixture: ComponentFixture<ImportGroupRowComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe('ImportGroupRowComponent', { timeout: 20000 }, () => {
  it('changes the type of the group', () => {
    const { fixture, store, group } = render({ groupTarget: null });
    const select = root(fixture).querySelector<HTMLSelectElement>('select[data-group-target]')!;
    select.value = 'CEO';
    select.dispatchEvent(new Event('change'));
    expect(store.setGroupTarget).toHaveBeenCalledWith(group.key, 'CEO');
  });

  it('asks for the fiber count for cable types', () => {
    const { fixture } = render({ placemarks: [lineItem()] });
    expect(root(fixture).querySelector('input[data-fibers]')).not.toBeNull();
  });

  it('does not ask for the fiber count for point types', () => {
    const { fixture } = render();
    expect(root(fixture).querySelector('input[data-fibers]')).toBeNull();
  });

  it('opens the group and lists items by name, "(sem nome)" when empty', () => {
    const { fixture } = render({ placemarks: [pointItem(1, 'CTO-001'), pointItem(2, '')] });
    root(fixture).querySelector<HTMLButtonElement>('button[data-toggle]')!.click();
    fixture.detectChanges();
    const names = Array.from(root(fixture).querySelectorAll('[data-item-name]')).map((el) => el.textContent?.trim());
    expect(names).toEqual(['CTO-001', '(sem nome)']);
  });

  it('changes one item and can send it back to the group', () => {
    const { fixture, store } = render({ placemarks: [pointItem(1, 'CTO-001')] });
    root(fixture).querySelector<HTMLButtonElement>('button[data-toggle]')!.click();
    fixture.detectChanges();
    const select = root(fixture).querySelector<HTMLSelectElement>('select[data-item-target]')!;
    select.value = 'CEO';
    select.dispatchEvent(new Event('change'));
    expect(store.setItemTarget).toHaveBeenLastCalledWith('p-1', 'CEO');
    select.value = '';
    select.dispatchEvent(new Event('change'));
    expect(store.setItemTarget).toHaveBeenLastCalledWith('p-1', null);
  });

  it('offers "Atualizar posição" only for moved items', () => {
    const { fixture, store } = render({
      placemarks: [pointItem(1, 'CTO-001'), pointItem(2, 'CTO-002')],
      matches: { 'p-1': { status: 'moved', id: 'b1', kind: 'box' }, 'p-2': { status: 'new' } },
    });
    root(fixture).querySelector<HTMLButtonElement>('button[data-toggle]')!.click();
    fixture.detectChanges();
    const boxes = root(fixture).querySelectorAll<HTMLInputElement>('input[data-move]');
    expect(boxes).toHaveLength(1);
    boxes[0].checked = true;
    boxes[0].dispatchEvent(new Event('change'));
    expect(store.setMove).toHaveBeenCalledWith('p-1', true);
  });

  it('shows the warning of a name taken by another type', () => {
    const { fixture } = render({
      placemarks: [pointItem(1, 'CTO-01')],
      matches: { 'p-1': { status: 'new', nameTakenByOtherType: 'CTO' } },
    });
    root(fixture).querySelector<HTMLButtonElement>('button[data-toggle]')!.click();
    fixture.detectChanges();
    expect(root(fixture).textContent).toContain('já existe uma CTO com este nome');
  });

  it('renders at most 200 items and a "Mostrar mais 200" button', () => {
    const many = Array.from({ length: 500 }, (_, i) => pointItem(i + 1, `CTO-${i + 1}`));
    const { fixture } = render({ placemarks: many });
    root(fixture).querySelector<HTMLButtonElement>('button[data-toggle]')!.click();
    fixture.detectChanges();
    expect(root(fixture).querySelectorAll('[data-item-name]')).toHaveLength(200);

    const more = Array.from(root(fixture).querySelectorAll<HTMLButtonElement>('button[data-more]'));
    more[0].click();
    fixture.detectChanges();
    expect(root(fixture).querySelectorAll('[data-item-name]')).toHaveLength(400);
  });
});
