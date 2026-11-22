import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/auth/auth-guards';

export const routes: Routes = [
  {
    path: 'entrar',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/sign-in-page').then((module) => module.SignInPage),
    title: 'GeoFiber — Entrar',
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/network-map/network-map-page').then((module) => module.NetworkMapPage),
    title: 'GeoFiber — Mapa da rede',
  },
  {
    path: 'modelos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/network-models/network-models-page').then(
        (module) => module.NetworkModelsPage,
      ),
    title: 'GeoFiber — Modelos de rede',
  },
  {
    path: 'caixas/:boxId/fusoes',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/box-splices/box-splices-page').then((module) => module.BoxSplicesPage),
    title: 'GeoFiber — Fusões',
  },
  {
    path: 'importar',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/network-import/network-import-page').then(
        (module) => module.NetworkImportPage,
      ),
    title: 'GeoFiber — Importar rede',
  },
  {
    path: 'usuarios',
    // A ordem importa: sem sessão o authGuard manda ao login antes do adminGuard mandar ao mapa.
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./features/users/users-page').then((module) => module.UsersPage),
    title: 'GeoFiber — Usuários',
  },
  { path: '**', redirectTo: '' },
];
