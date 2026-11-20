import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { parseApiError } from '../../core/api/api-error';
import type { InfrastructureStatus } from '../../core/api/api-types';
import { ImportApi } from '../../core/api/resources/import-api';
import type { ImportNetworkRequest, ImportNetworkResponse } from '../../core/api/import-types';
import { NetworkFileError, readNetworkFile } from '../../core/import/network-file';
import { groupPlacemarks, suggestTarget, type ImportGroup, type ImportTarget } from '../../core/import/import-groups';
import { buildImport, DEFAULT_FIBERS, MAX_IMPORT_ITEMS, targetOf, type ImportChoices, type ImportSummary } from '../../core/import/import-request';
import { matchPlacemarks, type ImportMatch } from '../../core/import/import-match';
import { readKml, type KmlPlacemark } from '../../core/import/kml-reader';
import { importPreview } from '../../core/import/import-preview';
import type { GeoPoint } from '../../core/models/geo.model';
import { NetworkMapRepository } from '../../core/network/network-map-repository';
import { NotificationService } from '../../core/services/notification';

export type ImportState = 'empty' | 'reading' | 'ready' | 'saving' | 'done';

const NOT_READ = 'Não foi possível ler o arquivo.';
const NOTHING = 'Nada a importar: todos os itens já existem ou foram ignorados.';
const TOO_MANY = 'O arquivo tem itens demais para uma importação (máximo 10.000). Divida o arquivo.';

/** Estado da tela de importação (um por página). Gravação só ao confirmar. */
@Injectable()
export class NetworkImportStore {
  private readonly importApi = inject(ImportApi);
  private readonly repository = inject(NetworkMapRepository);
  private readonly notifications = inject(NotificationService);

  readonly state = signal<ImportState>('empty');
  readonly fileName = signal('');
  readonly error = signal<string | null>(null);
  readonly warnings = signal<string[]>([]);
  readonly result = signal<ImportNetworkResponse | null>(null);
  readonly icons = signal<ReadonlyMap<string, string>>(new Map());
  readonly choices = signal<ImportChoices>(emptyChoices());

  private readonly placemarks = signal<readonly KmlPlacemark[]>([]);

  readonly groups = computed<ImportGroup[]>(() => groupPlacemarks(this.placemarks()));

  /** Itens com o tipo que a pessoa escolheu (sem escolha = null). */
  private readonly targeted = computed(() => {
    const choices = this.choices();
    return this.groups().flatMap((group) =>
      group.items.map((placemark) => ({ placemark, target: targetOf(group, placemark, choices) })),
    );
  });

  /** Compara com a rede atual; recalcula sozinho quando a rede recarrega. */
  readonly matches = computed<ReadonlyMap<string, ImportMatch>>(() =>
    matchPlacemarks(
      this.targeted().filter((i): i is { placemark: KmlPlacemark; target: ImportTarget } => i.target !== null),
      this.existing(),
    ),
  );

  private readonly built = computed(() =>
    buildImport(this.groups(), this.choices(), this.matches(), this.existing()),
  );

  readonly summary = computed<ImportSummary>(() => this.built().summary);

  /** O que aparece no mapa de prévia (novos e movidos escolhidos). */
  readonly preview = computed(() =>
    importPreview(this.groups(), this.choices(), this.matches(), this.existing()),
  );

  /** Posições gravadas na última importação, para "Ver no mapa". */
  readonly importedPoints = signal<readonly GeoPoint[]>([]);

  private readonly existing = computed(() => ({
    elements: this.repository.elements(),
    cables: this.repository.mapCables(),
  }));

  /** Abre o arquivo, agrupa e sugere o tipo de cada grupo de pontos. */
  async open(file: File): Promise<void> {
    this.releaseIcons();
    this.state.set('reading');
    this.error.set(null);
    this.result.set(null);
    try {
      const opened = await readNetworkFile(file);
      const read = readKml(opened.kml);
      this.fileName.set(file.name);
      this.placemarks.set(read.placemarks);
      this.warnings.set(read.warnings);
      this.icons.set(this.iconUrls(opened.icons));
      this.choices.set(initialChoices(groupPlacemarks(read.placemarks)));
      this.state.set('ready');
    } catch (error) {
      this.placemarks.set([]);
      this.error.set(error instanceof NetworkFileError ? error.message : NOT_READ);
      this.state.set('empty');
    }
  }

  setGroupTarget(key: string, target: ImportTarget | null): void {
    this.choices.update((c) => ({
      ...c,
      groups: withEntry(c.groups, key, (old) => ({ target, fiberCapacity: old?.fiberCapacity ?? DEFAULT_FIBERS })),
    }));
  }

  setGroupFibers(key: string, fiberCapacity: number): void {
    this.choices.update((c) => ({
      ...c,
      groups: withEntry(c.groups, key, (old) => ({ target: old?.target ?? null, fiberCapacity })),
    }));
  }

  /** Troca só deste item; `null` volta a valer o tipo do grupo. */
  setItemTarget(ref: string, target: ImportTarget | null): void {
    this.choices.update((c) => {
      const items = new Map(c.items);
      if (target === null) items.delete(ref);
      else items.set(ref, target);
      return { ...c, items };
    });
  }

  setMove(ref: string, update: boolean): void {
    this.choices.update((c) => {
      const moves = new Set(c.moves);
      if (update) moves.add(ref);
      else moves.delete(ref);
      return { ...c, moves };
    });
  }

  setUsageStatus(usageStatus: InfrastructureStatus): void {
    this.choices.update((c) => ({ ...c, usageStatus }));
  }

  setLinkCableEnds(linkCableEnds: boolean): void {
    this.choices.update((c) => ({ ...c, linkCableEnds }));
  }

  /** Envia tudo de uma vez. Com grupo sem escolha, passa de 10.000 itens ou nada a importar, não envia. */
  submit(): void {
    if (this.state() === 'saving') return;
    const { request, summary } = this.built();
    if (summary.undecidedGroups > 0) return;
    if (summary.total > MAX_IMPORT_ITEMS) {
      this.error.set(TOO_MANY);
      return;
    }
    if (summary.total === 0) {
      this.error.set(NOTHING);
      return;
    }
    this.error.set(null);
    this.state.set('saving');
    const points = importedPointsOf(request);
    this.importApi.importNetwork(request).subscribe({
      next: (response) => this.finish(response, points),
      error: (error: unknown) => this.fail(error),
    });
  }

  reset(): void {
    this.releaseIcons();
    this.placemarks.set([]);
    this.choices.set(emptyChoices());
    this.warnings.set([]);
    this.error.set(null);
    this.result.set(null);
    this.fileName.set('');
    this.state.set('empty');
  }

  private finish(response: ImportNetworkResponse, points: readonly GeoPoint[]): void {
    this.result.set(response);
    this.importedPoints.set(points);
    this.state.set('done');
    this.repository.load();
    this.notifications.success('Importação concluída.');
  }

  private fail(error: unknown): void {
    const message = parseApiError(error).message;
    this.error.set(message);
    this.state.set('ready');
    if (error instanceof HttpErrorResponse && error.status === 409) {
      this.repository.load();
    }
  }

  private iconUrls(icons: ReadonlyMap<string, Blob>): ReadonlyMap<string, string> {
    const urls = new Map<string, string>();
    for (const [path, blob] of icons) {
      urls.set(path, URL.createObjectURL(blob));
    }
    return urls;
  }

  private releaseIcons(): void {
    for (const url of this.icons().values()) {
      URL.revokeObjectURL(url);
    }
    this.icons.set(new Map());
  }
}

function emptyChoices(): ImportChoices {
  return {
    groups: new Map(),
    items: new Map(),
    moves: new Set(),
    usageStatus: 'INSTALLED',
    linkCableEnds: true,
  };
}

/** Sugestão inicial: pontos pelo nome; linhas sem tipo (a pessoa escolhe). */
function initialChoices(groups: readonly ImportGroup[]): ImportChoices {
  return {
    ...emptyChoices(),
    groups: new Map(
      groups.map((g) => [g.key, { target: suggestTarget(g), fiberCapacity: DEFAULT_FIBERS }]),
    ),
  };
}

function importedPointsOf(request: ImportNetworkRequest): GeoPoint[] {
  const points: GeoPoint[] = [];
  for (const e of request.elements ?? []) {
    if (e.location) points.push({ lat: e.location.latitude, lng: e.location.longitude });
  }
  for (const cable of request.cables ?? []) {
    for (const c of cable.coordinates ?? []) points.push({ lat: c.latitude, lng: c.longitude });
  }
  return points;
}

function withEntry<T>(
  map: ReadonlyMap<string, T>,
  key: string,
  update: (old: T | undefined) => T,
): Map<string, T> {
  const next = new Map(map);
  next.set(key, update(map.get(key)));
  return next;
}
