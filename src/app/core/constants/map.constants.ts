import { MapTool, MapViewState } from '../models/geo.model';

/** Camada base disponível no seletor de mapas. */
export interface BaseLayerDefinition {
  key: string;
  label: string;
  icon: string;
  url: string;
  attribution: string;
  maxZoom: number;
}

export const BASE_LAYERS: readonly BaseLayerDefinition[] = [
  {
    key: 'streets',
    label: 'Ruas (OpenStreetMap)',
    icon: 'map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; colaboradores do OpenStreetMap',
    maxZoom: 19,
  },
  {
    key: 'satellite',
    label: 'Satélite (Esri World Imagery)',
    icon: 'satellite_alt',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagens &copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
  {
    key: 'light',
    label: 'Claro (CARTO)',
    icon: 'light_mode',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 20,
  },
  {
    key: 'dark',
    label: 'Escuro (CARTO)',
    icon: 'dark_mode',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 20,
  },
];

export const DEFAULT_BASE_LAYER_KEY = 'streets';
export const MIN_BASE_LAYER_OPACITY = 0.2;

/** Visão inicial: São Paulo/SP. */
export const DEFAULT_MAP_VIEW: MapViewState = {
  center: { lat: -23.5505, lng: -46.6333 },
  zoom: 13,
};

export const MAP_MIN_ZOOM = 3;
export const MAP_MAX_ZOOM = 20;

export const PINS_STORAGE_KEY = 'geofiber.pins.v1';
export const MAP_PREFERENCES_STORAGE_KEY = 'geofiber.map-preferences.v1';

export const TOOL_LABELS: Record<MapTool, string> = {
  select: 'Selecionar',
  addPin: 'Adicionar PIN',
  move: 'Mover PIN',
};

export function baseLayerDefinition(key: string): BaseLayerDefinition {
  return BASE_LAYERS.find((layer) => layer.key === key) ?? BASE_LAYERS[0];
}
