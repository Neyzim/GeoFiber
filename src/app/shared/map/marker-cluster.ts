import type * as L from 'leaflet';
// O Leaflet precisa rodar antes do plugin (ele cria o L global que o plugin estende). O import acima
// é só de tipos e some na compilação, por isso este import explícito.
import 'leaflet';
import 'leaflet.markercluster';

/**
 * Cria um grupo de clusters do `leaflet.markercluster`.
 *
 * O plugin é um script antigo (UMD) que se pendura no `L` global (`window.L`). No build de produção,
 * o `import * as L from 'leaflet'` vira uma cópia do módulo feita antes disso, sem `markerClusterGroup`
 * ("markerClusterGroup is not a function" e o mapa não abre). Por isso a fábrica é lida do `L` global.
 */
export function createMarkerClusterGroup(options?: L.MarkerClusterGroupOptions): L.MarkerClusterGroup {
  const leaflet = (globalThis as unknown as { L?: typeof L }).L;
  if (!leaflet?.markerClusterGroup) {
    throw new Error('leaflet.markercluster não foi carregado');
  }
  return leaflet.markerClusterGroup(options);
}
