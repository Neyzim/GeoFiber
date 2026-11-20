import type { GeoPoint } from '../models/geo.model';
import { NetworkFileError } from './network-file';

/** Estilo de um item do KML. Cores em `#rrggbb`. */
export interface KmlStyle {
  iconHref?: string;
  iconColor?: string;
  lineColor?: string;
  lineWidth?: number;
}

export type KmlGeometry =
  | { kind: 'point'; point: GeoPoint }
  | { kind: 'line'; points: GeoPoint[] };

export interface KmlPlacemark {
  /** `p-<n>` para pontos e `l-<n>` para linhas; `n` é a posição do Placemark no documento. */
  ref: string;
  name: string;
  description: string;
  folderPath: readonly string[];
  geometry: KmlGeometry;
  style: KmlStyle;
}

export interface KmlReadResult {
  placemarks: KmlPlacemark[];
  warnings: string[];
}

/** Lê o texto de um KML e devolve os itens com pontos e linhas. Casa tags pelo nome local. */
export function readKml(kml: string): KmlReadResult {
  const xml = new DOMParser().parseFromString(kml, 'application/xml');
  if (xml.getElementsByTagName('parsererror').length > 0) {
    throw new NetworkFileError('Este arquivo não é um KMZ/KML válido.');
  }

  const all = Array.from(xml.getElementsByTagName('*'));
  const styles = collectStyles(all);
  const warnings: string[] = [];
  const placemarks: KmlPlacemark[] = [];
  let invalid = 0;
  let areas = 0;
  let links = 0;

  all.forEach((el) => {
    if (local(el) === 'Polygon') areas++;
    if (local(el) === 'NetworkLink') links++;
  });

  const folderCache = new Map<Element, string>();
  let index = 0;
  for (const el of all) {
    if (local(el) !== 'Placemark') continue;
    index++;
    const name = childText(el, 'name');
    const description = htmlToText(childText(el, 'description'));
    const folderPath = folderNames(el, folderCache);
    const style = placemarkStyle(el, styles);
    const parsed: KmlGeometry[] = [];
    for (const geometry of geometriesOf(el)) {
      const result = parseGeometry(geometry);
      if (result === null) invalid++;
      else parsed.push(result);
    }
    // Um Placemark com várias geometrias válidas ganha sufixo -1, -2…
    parsed.forEach((geometry, i) => {
      const prefix = geometry.kind === 'point' ? 'p' : 'l';
      const ref = parsed.length > 1 ? `${prefix}-${index}-${i + 1}` : `${prefix}-${index}`;
      placemarks.push({ ref, name, description, folderPath, geometry, style });
    });
  }

  if (areas > 0) warnings.push(plural(areas, '1 área (polígono) foi ignorada.', `${areas} áreas (polígonos) foram ignoradas.`));
  if (links > 0) warnings.push(plural(links, '1 link de rede foi ignorado.', `${links} links de rede foram ignorados.`));
  if (invalid > 0) warnings.push(plural(invalid, '1 item com coordenadas inválidas foi ignorado.', `${invalid} itens com coordenadas inválidas foram ignorados.`));

  if (placemarks.length === 0) {
    throw new NetworkFileError('Nenhum ponto ou linha encontrado no arquivo.');
  }
  return { placemarks, warnings };
}

function local(el: Element): string {
  return el.localName ?? el.nodeName.split(':').pop() ?? '';
}

function children(el: Element, name: string): Element[] {
  return Array.from(el.children).filter((child) => local(child) === name);
}

function child(el: Element, name: string): Element | undefined {
  for (const node of Array.from(el.children)) {
    if (local(node) === name) return node;
  }
  return undefined;
}

function childText(el: Element, name: string): string {
  return (child(el, name)?.textContent ?? '').trim();
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/** Pastas que contêm o Placemark, de fora para dentro, sem o Document. Nome de cada pasta é lido uma vez. */
function folderNames(el: Element, cache: Map<Element, string>): string[] {
  const names: string[] = [];
  let parent = el.parentElement;
  while (parent) {
    if (local(parent) === 'Folder') {
      let name = cache.get(parent);
      if (name === undefined) {
        name = childText(parent, 'name');
        cache.set(parent, name);
      }
      names.unshift(name);
    }
    parent = parent.parentElement;
  }
  return names;
}

/** Geometrias diretas do Placemark; MultiGeometry vira uma por item. */
function geometriesOf(el: Element): Element[] {
  const out: Element[] = [];
  for (const node of Array.from(el.children)) {
    const name = local(node);
    if (name === 'Point' || name === 'LineString') out.push(node);
    if (name === 'MultiGeometry') {
      for (const inner of Array.from(node.children)) {
        if (local(inner) === 'Point' || local(inner) === 'LineString') out.push(inner);
      }
    }
  }
  return out;
}

function parseGeometry(el: Element): KmlGeometry | null {
  const points = parseCoordinates(el);
  if (local(el) === 'Point') {
    return points.length >= 1 ? { kind: 'point', point: points[0] } : null;
  }
  const unique = points.filter((p, i) => i === 0 || p.lat !== points[i - 1].lat || p.lng !== points[i - 1].lng);
  return unique.length >= 2 ? { kind: 'line', points: unique } : null;
}

/** Lê `lon,lat[,alt]` separados por espaço, quebra de linha ou tab. Ignora o que não é número válido. */
function parseCoordinates(el: Element): GeoPoint[] {
  const text = (child(el, 'coordinates')?.textContent ?? '').replace(/\s*,\s*/g, ',');
  const points: GeoPoint[] = [];
  for (const token of text.split(/\s+/).filter(Boolean)) {
    const [lng, lat] = token.split(',').map(Number);
    if (Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      points.push({ lat, lng });
    } else {
      return [];
    }
  }
  return points;
}

/** Estilos por id, e StyleMap apontando para o estilo do `normal`. */
function collectStyles(all: Element[]): Map<string, KmlStyle> {
  const styles = new Map<string, KmlStyle>();
  const maps = new Map<string, string>();
  for (const el of all) {
    const id = el.getAttribute('id');
    if (!id) continue;
    if (local(el) === 'Style') styles.set(id, readStyle(el));
    if (local(el) === 'StyleMap') {
      const normal = children(el, 'Pair').find((pair) => childText(pair, 'key') === 'normal');
      const target = normal ? childText(normal, 'styleUrl') : '';
      if (target) maps.set(id, target.replace(/^#/, ''));
    }
  }
  for (const [id, target] of maps) {
    const style = styles.get(target);
    if (style) styles.set(id, style);
  }
  return styles;
}

function placemarkStyle(el: Element, styles: Map<string, KmlStyle>): KmlStyle {
  const inline = child(el, 'Style');
  if (inline) return readStyle(inline);
  const url = childText(el, 'styleUrl').replace(/^#/, '');
  return styles.get(url) ?? {};
}

function readStyle(el: Element): KmlStyle {
  const style: KmlStyle = {};
  const icon = child(el, 'IconStyle');
  if (icon) {
    const color = kmlColor(childText(icon, 'color'));
    if (color) style.iconColor = color;
    const href = childText(child(icon, 'Icon') ?? icon, 'href');
    if (href) style.iconHref = href;
  }
  const line = child(el, 'LineStyle');
  if (line) {
    const color = kmlColor(childText(line, 'color'));
    if (color) style.lineColor = color;
    const width = Number(childText(line, 'width'));
    if (childText(line, 'width') && Number.isFinite(width)) style.lineWidth = width;
  }
  return style;
}

/** KML guarda `aabbggrr`; o mapa usa `#rrggbb`. */
function kmlColor(value: string): string | undefined {
  if (!/^[0-9a-f]{8}$/i.test(value)) return undefined;
  return `#${value.slice(6, 8)}${value.slice(4, 6)}${value.slice(2, 4)}`.toLowerCase();
}

function htmlToText(html: string): string {
  if (!html.includes('<')) return html.replace(/\s+/g, ' ').trim();
  const body = new DOMParser().parseFromString(html, 'text/html').body;
  return (body.textContent ?? '').replace(/\s+/g, ' ').trim();
}
