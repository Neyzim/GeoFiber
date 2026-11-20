import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';
import { strToUtf8 } from '../../../testing/bytes';
import { ImportApi } from '../../core/api/resources/import-api';
import { ImportNetworkResponse } from '../../core/api/import-types';
import { NetworkMapRepository } from '../../core/network/network-map-repository';
import { NotificationService } from '../../core/services/notification';
import { NetworkImportStore } from './network-import-store';

const KML = `<?xml version="1.0" encoding="UTF-8"?><kml><Document>
  <Folder><name>CTOs</name>
    <Placemark><name>CTO-001</name><Point><coordinates>-51.57,-10.65</coordinates></Point></Placemark>
    <Placemark><name>CTO-002</name><Point><coordinates>-51.58,-10.66</coordinates></Point></Placemark>
  </Folder>
</Document></kml>`;

const fileOf = (text: string, name = 'rede.kml') => new File([strToUtf8(text)], name);

const RESPONSE: ImportNetworkResponse = {
  created: { boxes: 2, olts: 0, cables: 0, attachments: 0 },
  moved: 0,
  reshaped: 0,
  ids: {},
};

describe('NetworkImportStore', () => {
  let store: NetworkImportStore;
  let importApi: { importNetwork: ReturnType<typeof vi.fn> };
  let repository: {
    elements: WritableSignal<unknown[]>;
    mapCables: WritableSignal<unknown[]>;
    load: ReturnType<typeof vi.fn>;
  };
  let notifications: { success: ReturnType<typeof vi.fn>; apiError: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    importApi = { importNetwork: vi.fn(() => of(RESPONSE)) };
    repository = {
      elements: signal<unknown[]>([]),
      mapCables: signal<unknown[]>([]),
      load: vi.fn(),
    };
    notifications = {
      success: vi.fn(),
      apiError: vi.fn((error: unknown) => ({ message: 'erro', original: null, error })),
    };
    TestBed.configureTestingModule({
      providers: [
        NetworkImportStore,
        { provide: ImportApi, useValue: importApi },
        { provide: NetworkMapRepository, useValue: repository },
        { provide: NotificationService, useValue: notifications },
      ],
    });
    store = TestBed.inject(NetworkImportStore);
  });

  it('reads a file, groups it and suggests types', async () => {
    await store.open(fileOf(KML));
    expect(store.state()).toBe('ready');
    expect(store.groups()).toHaveLength(1);
    expect(store.groups()[0].label).toBe('CTOs');
    expect(store.choices().groups.get(store.groups()[0].key)?.target).toBe('CTO');
  });

  it('shows the reading error and stays empty', async () => {
    await store.open(fileOf('não é xml', 'ruim.kml'));
    expect(store.state()).toBe('empty');
    expect(store.error()).toBe('Este arquivo não é um KMZ/KML válido.');
  });

  it('blocks the import while a group has no choice', async () => {
    await store.open(fileOf(KML));
    store.setGroupTarget(store.groups()[0].key, null);
    expect(store.summary().undecidedGroups).toBe(1);
    store.submit();
    expect(importApi.importNetwork).not.toHaveBeenCalled();
  });

  it('sends one request, reloads the network and keeps the result', async () => {
    await store.open(fileOf(KML));
    store.submit();
    expect(importApi.importNetwork).toHaveBeenCalledTimes(1);
    expect(importApi.importNetwork.mock.calls[0][0].elements).toHaveLength(2);
    expect(repository.load).toHaveBeenCalledTimes(1);
    expect(store.state()).toBe('done');
    expect(store.result()).toEqual(RESPONSE);
    expect(notifications.success).toHaveBeenCalled();
  });

  it('builds the preview from the choices', async () => {
    await store.open(fileOf(KML));
    expect(store.preview().elements.map((e) => e.name)).toEqual(['CTO-001', 'CTO-002']);
    expect(store.preview().points).toHaveLength(2);
  });

  it('remembers the imported positions after a successful import', async () => {
    await store.open(fileOf(KML));
    store.submit();
    expect(store.importedPoints()).toEqual([
      { lat: -10.65, lng: -51.57 },
      { lat: -10.66, lng: -51.58 },
    ]);
  });

  it('on 409 reloads, recomputes the duplicates and keeps the choices', async () => {
    const conflict = new HttpErrorResponse({
      status: 409,
      error: { status: 409, detail: 'Import has elements that already exist' },
    });
    importApi.importNetwork.mockReturnValueOnce(throwError(() => conflict));
    await store.open(fileOf(KML));
    const before = store.choices().groups.get(store.groups()[0].key);

    store.submit();

    expect(store.error()).toContain('Alguns itens já existem na rede');
    expect(repository.load).toHaveBeenCalledTimes(1);
    expect(store.state()).toBe('ready');
    expect(store.choices().groups.get(store.groups()[0].key)).toEqual(before);

    repository.elements.set([
      { key: 'box:b1', kind: 'box', id: 'b1', group: 'CTO', name: 'CTO-001', status: 'INSTALLED', position: { lat: -10.65, lng: -51.57 }, details: [] },
    ]);
    expect(store.matches().get('p-1')).toEqual({ status: 'same', id: 'b1' });
  });

  it('refuses more than 10.000 items', async () => {
    const big = Array.from(
      { length: 10001 },
      (_, i) => `<Placemark><name>X${i}</name><Point><coordinates>-51.5,-10.6</coordinates></Point></Placemark>`,
    ).join('');
    await store.open(fileOf(`<kml><Document><Folder><name>CTOs</name>${big}</Folder></Document></kml>`));
    store.submit();
    expect(importApi.importNetwork).not.toHaveBeenCalled();
    expect(store.error()).toBe('O arquivo tem itens demais para uma importação (máximo 10.000). Divida o arquivo.');
  }, 20000);
});
