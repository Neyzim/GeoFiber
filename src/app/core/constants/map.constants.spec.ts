import { BASE_LAYERS, MAP_MAX_ZOOM, baseLayerDefinition } from './map.constants';

describe('BASE_LAYERS', () => {
  it('toda camada vai até o zoom máximo do mapa (senão o fundo some ao aproximar)', () => {
    for (const layer of BASE_LAYERS) {
      expect(layer.maxZoom).toBe(MAP_MAX_ZOOM);
    }
  });

  it('o zoom nativo nunca passa do zoom máximo (acima dele o último tile é ampliado)', () => {
    for (const layer of BASE_LAYERS) {
      expect(layer.maxNativeZoom).toBeLessThanOrEqual(layer.maxZoom);
    }
  });

  it('ruas usam tiles do OSM até o 19', () => {
    expect(baseLayerDefinition('streets').maxNativeZoom).toBe(19);
  });

  it('satélite para de pedir tiles no 18, onde a Esri ainda tem imagem', () => {
    expect(baseLayerDefinition('satellite').maxNativeZoom).toBe(18);
  });
});
