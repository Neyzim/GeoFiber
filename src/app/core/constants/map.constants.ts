import { MapTool, MapViewState } from '../models/geo.model';

/** Camada base disponível no seletor de mapas. */
export interface BaseLayerDefinition {
  key: string;
  label: string;
  icon: string;
  url: string;
  attribution: string;
  /** Zoom máximo da camada no mapa; igual a MAP_MAX_ZOOM para o fundo nunca sumir. */
  maxZoom: number;
  /** Último zoom com tiles reais no servidor; acima dele o Leaflet amplia esse tile. */
  maxNativeZoom: number;
}

export const MAP_MIN_ZOOM = 3;
export const MAP_MAX_ZOOM = 20;

export const BASE_LAYERS: readonly BaseLayerDefinition[] = [
  {
    key: 'streets',
    label: 'Ruas (OpenStreetMap)',
    icon: 'map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; colaboradores do OpenStreetMap',
    maxZoom: MAP_MAX_ZOOM,
    maxNativeZoom: 19,
  },
  {
    key: 'satellite',
    label: 'Satélite (Esri World Imagery)',
    icon: 'satellite_alt',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagens &copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: MAP_MAX_ZOOM,
    // Em boa parte do Brasil a Esri não tem imagem no 19 e devolve "Map data not yet available".
    maxNativeZoom: 17,
  },
];

export const DEFAULT_BASE_LAYER_KEY = 'streets';
export const MIN_BASE_LAYER_OPACITY = 0.2;

/** Visão inicial: São Paulo/SP. */
export const DEFAULT_MAP_VIEW: MapViewState = {
  center: { lat: -23.5505, lng: -46.6333 },
  zoom: 13,
};

export const THEME_STORAGE_KEY = 'geofiber.theme.v1';
/** Chaves antigas de PINs e cabos, apagadas na inicialização (a rede vive no backend). */
export const LEGACY_STORAGE_KEYS = ['geofiber.pins.v1', 'geofiber.cables.v1'] as const;
export const MAP_PREFERENCES_STORAGE_KEY = 'geofiber.map-preferences.v1';
export const NETWORK_MODELS_STORAGE_KEY = 'geofiber.network-models.v1';

export const TOOL_LABELS: Record<MapTool, string> = {
  select: 'Selecionar',
  addElement: 'Adicionar elemento',
  addCable: 'Traçar cabo',
  move: 'Mover elemento',
  editCable: 'Mover cabo',
};

export function baseLayerDefinition(key: string): BaseLayerDefinition {
  return BASE_LAYERS.find((layer) => layer.key === key) ?? BASE_LAYERS[0];
}
