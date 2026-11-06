import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/network-map/network-map-page').then((module) => module.NetworkMapPage),
    title: 'GeoFiber — Mapa da rede',
  },
  { path: '**', redirectTo: '' },
];
