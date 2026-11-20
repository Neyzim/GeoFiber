import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/** URL base da API do GeoFiber (ex.: `http://localhost:8080/api/v1`), sem barra final. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiBaseUrl.replace(/\/+$/, ''),
});

/** Monta a URL de um recurso, codificando cada segmento (ids, números). */
export function apiUrl(base: string, ...segments: (string | number)[]): string {
  return [base, ...segments.map((segment) => encodeURIComponent(String(segment)))].join('/');
}
