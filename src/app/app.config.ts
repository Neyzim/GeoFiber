import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { MAT_ICON_DEFAULT_OPTIONS } from '@angular/material/icon';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { acceptLanguageInterceptor } from './core/api/accept-language.interceptor';
import { authInterceptor } from './core/auth/auth.interceptor';
import { discardLegacyStorage } from './core/services/legacy-storage';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, acceptLanguageInterceptor])),
    // PINs e cabos antigos do navegador são descartados: a rede vive no backend.
    provideAppInitializer(() => discardLegacyStorage()),
    // Usa a fonte Material Symbols Outlined em todos os `mat-icon`.
    { provide: MAT_ICON_DEFAULT_OPTIONS, useValue: { fontSet: 'material-symbols-outlined' } },
  ],
};
