import type { MapCable, MapElement } from '../network/map-element';
import { groupPlacemarks, type ImportTarget } from './import-groups';
import type { KmlPlacemark } from './kml-reader';
import type { ImportMatch } from './import-match';
import { buildImport, type ImportChoices } from './import-request';

const BASE = { lat: -10.65, lng: -51.57 };

const point = (ref: string, name: string, p = BASE): KmlPlacemark => ({
  ref,
  name,
  description: '',
  folderPath: [],
  geometry: { kind: 'point', point: p },
  style: { iconHref: 'files/cto.png', iconColor: '#ff8800' },
});

const line = (ref: string, name: string, a: typeof BASE, b: typeof BASE): KmlPlacemark => ({
  ref,
  name,
  description: '',
  folderPath: [],
  geometry: { kind: 'line', points: [a, b] },
  style: { lineColor: '#00ff00', lineWidth: 2 },
});

const choices = (over: Partial<ImportChoices> = {}): ImportChoices => ({
  groups: new Map(),
  items: new Map(),
  moves: new Set(),
  usageStatus: 'INSTALLED',
  linkCableEnds: true,
  ...over,
});

const groupsOf = (placemarks: KmlPlacemark[]) => groupPlacemarks(placemarks);

const box = (id: string, p: typeof BASE): MapElement => ({
  key: `box:${id}`,
  kind: 'box',
  id,
  group: 'CTO',
  name: id,
  status: 'INSTALLED',
  position: p,
  details: [],
});

const olt = (id: string, p: typeof BASE): MapElement => ({
  key: `olt:${id}`,
  kind: 'olt',
  id,
  group: 'olt',
  name: id,
  status: 'INSTALLED',
  position: p,
  details: [],
});

const cableOf = (id: string, a: typeof BASE, b: typeof BASE): MapCable => ({
  id,
  name: id,
  role: 'DISTRIBUTION',
  status: 'INSTALLED',
  points: [a, b],
  fiberCapacity: 12,
  lengthMeters: null,
  details: [],
});

const NETWORK = { elements: [] as MapElement[], cables: [] as MapCable[] };

describe('buildImport', () => {
  it('creates new points and lines with the chosen type, status and fibers', () => {
    const placemarks = [
      point('p-1', 'CTO-A'),
      point('p-2', 'CTO-B', { lat: -10.7, lng: -51.6 }),
      line('l-3', 'Dist', { lat: -11, lng: -52 }, { lat: -11.01, lng: -52.01 }),
    ];
    const groups = groupsOf(placemarks);
    const c = choices({
      groups: new Map([
        [groups[0].key, { target: 'CTO', fiberCapacity: 12 }],
        [groups[1].key, { target: 'DISTRIBUTION' as ImportTarget, fiberCapacity: 24 }],
      ]),
    });
    const matches = new Map<string, ImportMatch>([
      ['p-1', { status: 'new' }],
      ['p-2', { status: 'new' }],
      ['l-3', { status: 'new' }],
    ]);

    const { request, summary } = buildImport(groups, c, matches, NETWORK);

    expect(request.usageStatus).toBe('INSTALLED');
    expect(request.elements).toMatchObject([
      { ref: 'p-1', action: 'CREATE', kind: 'BOX', type: 'CTO', name: 'CTO-A' },
      { ref: 'p-2', action: 'CREATE', kind: 'BOX', type: 'CTO', name: 'CTO-B' },
    ]);
    expect(request.elements[0].location).toEqual({ longitude: -51.57, latitude: -10.65 });
    expect(request.cables).toHaveLength(1);
    expect(request.cables[0]).toMatchObject({
      ref: 'l-3',
      action: 'CREATE',
      name: 'Dist',
      role: 'DISTRIBUTION',
      fiberCapacity: 24,
    });
    expect(request.cables[0].start).toBeUndefined();
    expect(summary.create).toBe(3);
  });

  it('names nameless items per type in file order', () => {
    const placemarks = [
      point('p-1', '', { lat: -10.65, lng: -51.57 }),
      point('p-2', '', { lat: -10.7, lng: -51.6 }),
      line('l-3', '', { lat: -11, lng: -52 }, { lat: -11.01, lng: -52.01 }),
    ];
    const groups = groupsOf(placemarks);
    const c = choices({
      groups: new Map([
        [groups[0].key, { target: 'CTO', fiberCapacity: 12 }],
        [groups[1].key, { target: 'FEEDER' as ImportTarget, fiberCapacity: 12 }],
      ]),
    });
    const matches = new Map<string, ImportMatch>([
      ['p-1', { status: 'new' }],
      ['p-2', { status: 'new' }],
      ['l-3', { status: 'new' }],
    ]);
    const { request } = buildImport(groups, c, matches, NETWORK);
    expect(request.elements.map((e) => e.name)).toEqual(['CTO importada 1', 'CTO importada 2']);
    expect(request.cables[0].name).toBe('Cabo importado 1');
  });

  it('names nameless items with a number that is free in the network and in the file', () => {
    const network = {
      elements: [box('CTO importada 1', BASE)],
      cables: [cableOf('Cabo importado 1', BASE, BASE)],
    };
    const placemarks = [
      point('p-1', ''),
      point('p-2', 'CTO importada 2', { lat: -10.7, lng: -51.6 }),
      point('p-3', '', { lat: -10.8, lng: -51.7 }),
      line('l-4', '', { lat: -11, lng: -52 }, { lat: -11.01, lng: -52.01 }),
    ];
    const groups = groupsOf(placemarks);
    const pointGroup = groups.find((g) => g.geometry === 'point')!;
    const lineGroup = groups.find((g) => g.geometry === 'line')!;
    const c = choices({
      groups: new Map([
        [pointGroup.key, { target: 'CTO', fiberCapacity: 12 }],
        [lineGroup.key, { target: 'DISTRIBUTION' as ImportTarget, fiberCapacity: 12 }],
      ]),
    });
    const matches = new Map<string, ImportMatch>([
      ['p-1', { status: 'new' }],
      ['p-2', { status: 'new' }],
      ['p-3', { status: 'new' }],
      ['l-4', { status: 'new' }],
    ]);
    const { request } = buildImport(groups, c, matches, network);
    expect(request.elements.map((e) => e.name)).toEqual([
      'CTO importada 3',
      'CTO importada 2',
      'CTO importada 4',
    ]);
    expect(request.cables[0].name).toBe('Cabo importado 2');
  });

  it('applies an individual change over the group and leaves out ignored items', () => {
    const placemarks = [point('p-1', 'CTO-1'), point('p-2', 'CTO-2', { lat: -10.7, lng: -51.6 }), point('p-3', 'CTO-3', { lat: -10.8, lng: -51.7 })];
    const groups = groupsOf(placemarks);
    const c = choices({
      groups: new Map([[groups[0].key, { target: 'CTO', fiberCapacity: 12 }]]),
      items: new Map<string, ImportTarget>([
        ['p-2', 'CEO'],
        ['p-3', 'IGNORE'],
      ]),
    });
    const matches = new Map<string, ImportMatch>([
      ['p-1', { status: 'new' }],
      ['p-2', { status: 'new' }],
    ]);
    const { request, summary } = buildImport(groups, c, matches, NETWORK);
    expect(request.elements.map((e) => [e.ref, e.type])).toEqual([
      ['p-1', 'CTO'],
      ['p-2', 'CEO'],
    ]);
    expect(summary.ignored).toBe(1);
  });

  it('skips what already exists and only moves what the person chose', () => {
    const placemarks = [
      point('p-1', 'CTO-1'),
      point('p-2', 'CTO-2', { lat: -10.7, lng: -51.6 }),
      point('p-3', 'CTO-3', { lat: -10.8, lng: -51.7 }),
      line('l-4', 'Tronco', { lat: -11, lng: -52 }, { lat: -11.01, lng: -52.01 }),
    ];
    const groups = groupsOf(placemarks);
    const c = choices({
      groups: new Map([
        [groups[0].key, { target: 'CTO', fiberCapacity: 12 }],
        [groups[1].key, { target: 'BACKBONE' as ImportTarget, fiberCapacity: 12 }],
      ]),
    });
    const matches = new Map<string, ImportMatch>([
      ['p-1', { status: 'same', id: 'b1' }],
      ['p-2', { status: 'moved', id: 'b2', kind: 'box' }],
      ['p-3', { status: 'new' }],
      ['l-4', { status: 'moved', id: 'c4', kind: 'cable' }],
    ]);

    const notChosen = buildImport(groups, c, matches, NETWORK);
    expect(notChosen.request.elements.map((e) => e.ref)).toEqual(['p-3']);
    expect(notChosen.request.cables).toEqual([]);
    expect(notChosen.summary).toMatchObject({ same: 1, moved: 2, update: 0 });

    const chosen = buildImport(
      groups,
      choices({ ...c, moves: new Set(['p-2', 'l-4']) }),
      matches,
      NETWORK,
    );
    expect(chosen.request.elements).toContainEqual(
      expect.objectContaining({ ref: 'p-2', action: 'MOVE', kind: 'BOX', id: 'b2' }),
    );
    expect(chosen.request.cables).toEqual([
      expect.objectContaining({ ref: 'l-4', action: 'RESHAPE', id: 'c4' }),
    ]);
    expect(chosen.summary.update).toBe(2);
  });

  it('links new cable ends to the nearest box or OLT within 15 m', () => {
    const start = { lat: -10.65, lng: -51.57 };
    const end = { lat: -10.7, lng: -51.6 };
    const placemarks = [
      line('l-1', 'Novo', start, end),
      point('p-2', 'CTO-novo', { lat: -10.70007, lng: -51.6 }),
      line('l-5', 'Longe', { lat: -12, lng: -53 }, { lat: -12.1, lng: -53.1 }),
    ];
    const groups = groupsOf(placemarks);
    const pointGroup = groups.find((g) => g.geometry === 'point')!;
    const lineGroup = groups.find((g) => g.geometry === 'line')!;
    const c = choices({
      groups: new Map([
        [pointGroup.key, { target: 'CTO', fiberCapacity: 12 }],
        [lineGroup.key, { target: 'DISTRIBUTION' as ImportTarget, fiberCapacity: 12 }],
      ]),
    });
    const matches = new Map<string, ImportMatch>([
      ['l-1', { status: 'new' }],
      ['p-2', { status: 'new' }],
      ['l-5', { status: 'new' }],
    ]);
    const network = {
      elements: [box('b1', { lat: -10.65009, lng: -51.57 }), olt('o9', { lat: -20, lng: -60 })],
      cables: [],
    };

    const { request, summary } = buildImport(groups, c, matches, network);
    const novo = request.cables.find((x) => x.ref === 'l-1')!;
    expect(novo.start).toEqual({ boxId: 'b1' });
    expect(novo.end).toEqual({ ref: 'p-2' });
    expect(request.cables.find((x) => x.ref === 'l-5')!.start).toBeUndefined();
    expect(summary.attachments).toBe(2);

    const off = buildImport(groups, choices({ ...c, linkCableEnds: false }), matches, network);
    expect(off.request.cables.find((x) => x.ref === 'l-1')!.start).toBeUndefined();
    expect(off.summary.attachments).toBe(0);
  });

  it('counts everything for the screen', () => {
    const placemarks = [
      point('p-1', 'CTO-1'),
      point('p-2', 'CTO-2', { lat: -10.7, lng: -51.6 }),
      point('p-3', 'CTO-3', { lat: -10.8, lng: -51.7 }),
      point('p-4', 'CTO-4', { lat: -10.9, lng: -51.8 }),
      point('p-5', 'CTO-5', { lat: -11, lng: -51.9 }),
      line('l-6', 'Sem escolha', { lat: -12, lng: -53 }, { lat: -12.1, lng: -53.1 }),
    ];
    const groups = groupsOf(placemarks);
    const pointGroup = groups.find((g) => g.geometry === 'point')!;
    const c = choices({
      groups: new Map([[pointGroup.key, { target: 'CTO', fiberCapacity: 12 }]]),
      items: new Map<string, ImportTarget>([['p-4', 'IGNORE']]),
    });
    const matches = new Map<string, ImportMatch>([
      ['p-1', { status: 'new' }],
      ['p-2', { status: 'same', id: 'b2' }],
      ['p-3', { status: 'moved', id: 'b3', kind: 'box' }],
      ['p-4', { status: 'new' }],
      ['p-5', { status: 'new' }],
      ['l-6', { status: 'new' }],
    ]);
    const { summary } = buildImport(groups, c, matches, NETWORK);
    expect(summary).toEqual({
      create: 2,
      same: 1,
      moved: 1,
      update: 0,
      attachments: 0,
      ignored: 1,
      undecidedGroups: 1,
      total: 2,
    });
  });
});
