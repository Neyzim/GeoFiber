import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/network-map/network-map-page').then((module) => module.NetworkMapPage),
    title: 'GeoFiber — Mapa da rede',
  },
  {
    path: 'modelos',
    loadComponent: () =>
      import('./features/network-models/network-models-page').then(
        (module) => module.NetworkModelsPage,
      ),
    title: 'GeoFiber — Modelos de rede',
  },
  { path: '**', redirectTo: '' },
];
