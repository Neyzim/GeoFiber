import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, input, signal } from '@angular/core';
import { GeoMapComponent } from '../../shared/map/geo-map';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { strToUtf8 } from '../../../testing/bytes';
import { ImportApi } from '../../core/api/resources/import-api';
import { NetworkMapRepository } from '../../core/network/network-map-repository';
import { NetworkMapState } from '../../core/network/network-map-state';
import { NotificationService } from '../../core/services/notification';
import { NetworkImportPage } from './network-import-page';
import { NetworkImportStore } from './network-import-store';
import { MapReturnService } from '../../core/services/map-return';

const KML = `<kml><Document>
  <Folder><name>CTOs</name>
    <Placemark><name>CTO-001</name><Point><coordinates>-51.57,-10.65</coordinates></Point></Placemark>
    <Placemark><name>CTO-002</name><Point><coordinates>-51.58,-10.66</coordinates></Point></Placemark>
  </Folder>
  <Folder><name>Rede</name>
    <Placemark><name>Tronco</name><LineString><coordinates>-51.57,-10.65 -51.58,-10.66</coordinates></LineString></Placemark>
  </Folder>
</Document></kml>`;

const fileOf = (text: string) => new File([strToUtf8(text)], 'rede.kml');

/** Substituto do mapa: o Leaflet não funciona no jsdom. Mesmas entradas, sem desenhar nada. */
@Component({ selector: 'app-geo-map', template: '' })
class StubGeoMap {
  readonly elements = input<unknown[]>([]);
  readonly paths = input<unknown[]>([]);
  readonly editable = input(true);
}

interface Setup {
  canEdit?: boolean;
  importError?: unknown;
}

function render(setup: Setup = {}) {
  const importApi = {
    importNetwork: vi.fn(() =>
      setup.importError !== undefined
        ? throwError(() => setup.importError)
        : of({ created: { boxes: 2, olts: 0, cables: 1, attachments: 1 }, moved: 0, reshaped: 0, ids: {} }),
    ),
  };
  const repository = { elements: signal([]), mapCables: signal([]), load: vi.fn() };
  const notifications = { success: vi.fn(), apiError: vi.fn(), error: vi.fn() };
  const mapState = { canEdit: signal(setup.canEdit ?? true) };
  TestBed.configureTestingModule({
    imports: [NetworkImportPage],
    providers: [
      provideRouter([]),
      { provide: ImportApi, useValue: importApi },
      { provide: NetworkMapRepository, useValue: repository },
      { provide: NotificationService, useValue: notifications },
      { provide: NetworkMapState, useValue: mapState },
    ],
  });
  TestBed.overrideComponent(NetworkImportPage, {
    remove: { imports: [GeoMapComponent] },
    add: { imports: [StubGeoMap] },
  });
  const fixture: ComponentFixture<NetworkImportPage> = TestBed.createComponent(NetworkImportPage);
  fixture.detectChanges();
  const store = fixture.debugElement.injector.get(NetworkImportStore);
  return { fixture, store, importApi, repository };
}

function text(fixture: ComponentFixture<NetworkImportPage>): string {
  return (fixture.nativeElement as HTMLElement).textContent ?? '';
}

/** Abre o KML e escolhe o tipo do grupo de linhas (ele começa sem escolha). */
async function loadKml(fixture: ComponentFixture<NetworkImportPage>, store: NetworkImportStore) {
  await store.open(fileOf(KML));
  const line = store.groups().find((g) => g.geometry === 'line')!;
  store.setGroupTarget(line.key, 'DISTRIBUTION');
  fixture.detectChanges();
}

function button(fixture: ComponentFixture<NetworkImportPage>, label: string): HTMLButtonElement {
  const found = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === label,
  );
  if (!found) throw new Error(`Botão "${label}" não encontrado`);
  return found;
}

describe('NetworkImportPage', { timeout: 20000 }, () => {
  it('asks for a file first', () => {
    const { fixture } = render();
    expect(text(fixture)).toContain('Solte aqui um arquivo .kmz ou .kml');
    expect(button(fixture, 'Escolher arquivo')).toBeTruthy();
  });

  it('shows the reading error', async () => {
    const { fixture, store } = render();
    await store.open(new File([strToUtf8('não é xml')], 'ruim.kml'));
    fixture.detectChanges();
    expect(text(fixture)).toContain('Este arquivo não é um KMZ/KML válido.');
  });

  it('lists point groups before line groups with counts and sample names', async () => {
    const { fixture, store } = render();
    await store.open(fileOf(KML));
    fixture.detectChanges();
    const body = text(fixture);
    expect(body.indexOf('CTOs')).toBeLessThan(body.indexOf('Tronco'));
    expect(body).toContain('2 itens: 2 novos');
    expect(body).toContain('CTO-001, CTO-002');
  });

  it('disables Importar until every group has a choice', async () => {
    const { fixture, store } = render();
    await loadKml(fixture, store);
    expect(button(fixture, 'Importar 3 itens').disabled).toBe(false);

    store.setGroupTarget(store.groups()[0].key, null);
    fixture.detectChanges();
    expect(button(fixture, 'Importar 1 item').disabled).toBe(true);
  });

  it('shows the result and a button to see it on the map', async () => {
    const { fixture, store, importApi } = render();
    await loadKml(fixture, store);
    button(fixture, 'Importar 3 itens').click();
    fixture.detectChanges();
    expect(importApi.importNetwork).toHaveBeenCalledTimes(1);
    expect(text(fixture)).toContain('Importação concluída: 2 caixas, 1 cabo, 1 ligação de cabo.');
    expect(button(fixture, 'Importar outro arquivo')).toBeTruthy();
  });

  it('shows the preview map of what will be imported', async () => {
    const { fixture, store } = render();
    await loadKml(fixture, store);
    expect((fixture.nativeElement as HTMLElement).querySelector('app-geo-map')).not.toBeNull();
  });

  it('sends the preview to the map to frame it', async () => {
    const { fixture, store } = render();
    await loadKml(fixture, store);
    button(fixture, 'Ver no mapa').click();
    const sent = TestBed.inject(MapReturnService).take();
    expect(sent).toEqual({ fit: store.preview().points });
  });

  it('says there is no permission without canEdit', () => {
    const { fixture } = render({ canEdit: false });
    expect(text(fixture)).toContain('Sem permissão para importar.');
    expect(text(fixture)).not.toContain('Escolher arquivo');
  });
});
