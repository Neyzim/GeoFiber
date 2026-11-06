import { Injectable, computed, effect, signal } from '@angular/core';
import {
  DEFAULT_BASE_LAYER_KEY,
  MAP_PREFERENCES_STORAGE_KEY,
  MIN_BASE_LAYER_OPACITY,
  baseLayerDefinition,
} from '../constants/map.constants';
import { MapViewState } from '../models/geo.model';

interface MapPreferences {
  baseLayerKey: string;
  baseLayerOpacity: number;
  showLegend: boolean;
  lastView: MapViewState | null;
}

const DEFAULTS: MapPreferences = {
  baseLayerKey: DEFAULT_BASE_LAYER_KEY,
  baseLayerOpacity: 1,
  showLegend: true,
  lastView: null,
};

/**
 * Preferências de visualização do mapa (camada base, opacidade, legenda e
 * última posição). Ficam separadas dos dados do projeto para poderem ser
 * reaproveitadas por outras telas que usem o mapa.
 */
@Injectable({ providedIn: 'root' })
export class MapPreferencesService {
  private readonly _preferences = signal<MapPreferences>(restorePreferences());

  readonly baseLayerKey = computed(() => this._preferences().baseLayerKey);
  readonly baseLayer = computed(() => baseLayerDefinition(this._preferences().baseLayerKey));
  readonly baseLayerOpacity = computed(() => this._preferences().baseLayerOpacity);
  readonly showLegend = computed(() => this._preferences().showLegend);
  readonly lastView = computed(() => this._preferences().lastView);

  constructor() {
    effect(() => {
      const preferences = this._preferences();
      try {
        localStorage.setItem(MAP_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
      } catch {
        // Armazenamento indisponível: mantém apenas em memória.
      }
    });
  }

  setBaseLayer(key: string): void {
    this._preferences.update((current) => ({ ...current, baseLayerKey: key }));
  }

  setBaseLayerOpacity(opacity: number): void {
    const clamped = Math.min(1, Math.max(MIN_BASE_LAYER_OPACITY, opacity));
    this._preferences.update((current) => ({ ...current, baseLayerOpacity: clamped }));
  }

  setShowLegend(show: boolean): void {
    this._preferences.update((current) => ({ ...current, showLegend: show }));
  }

  setLastView(view: MapViewState): void {
    this._preferences.update((current) => ({ ...current, lastView: view }));
  }
}

function restorePreferences(): MapPreferences {
  try {
    const raw = localStorage.getItem(MAP_PREFERENCES_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULTS };
    }
    const parsed = JSON.parse(raw) as Partial<MapPreferences>;
    return {
      baseLayerKey:
        typeof parsed.baseLayerKey === 'string' ? parsed.baseLayerKey : DEFAULTS.baseLayerKey,
      baseLayerOpacity:
        typeof parsed.baseLayerOpacity === 'number'
          ? parsed.baseLayerOpacity
          : DEFAULTS.baseLayerOpacity,
      showLegend: typeof parsed.showLegend === 'boolean' ? parsed.showLegend : DEFAULTS.showLegend,
      lastView: parsed.lastView ?? null,
    };
  } catch {
    return { ...DEFAULTS };
  }
}
