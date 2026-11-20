import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from './api-config';

/**
 * Pede ao backend as mensagens de validação em português.
 * Só atua nas chamadas à API do GeoFiber (tiles de mapa e afins ficam intactos).
 */
export const acceptLanguageInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(inject(API_BASE_URL))) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { 'Accept-Language': 'pt-BR' } }));
};
