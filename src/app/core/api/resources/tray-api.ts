import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL, apiUrl } from '../api-config';
import { TrayRequest, TrayResponse } from '../api-types';

/** Bandejas de emenda de uma caixa (`/boxes/{boxId}/trays`). */
@Injectable({ providedIn: 'root' })
export class TrayApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  list(boxId: string): Observable<TrayResponse[]> {
    return this.http.get<TrayResponse[]>(apiUrl(this.base, 'boxes', boxId, 'trays'));
  }

  create(boxId: string, body: TrayRequest): Observable<TrayResponse> {
    return this.http.post<TrayResponse>(apiUrl(this.base, 'boxes', boxId, 'trays'), body);
  }

  update(boxId: string, trayId: string, body: TrayRequest): Observable<TrayResponse> {
    return this.http.put<TrayResponse>(apiUrl(this.base, 'boxes', boxId, 'trays', trayId), body);
  }

  delete(boxId: string, trayId: string): Observable<void> {
    return this.http.delete<void>(apiUrl(this.base, 'boxes', boxId, 'trays', trayId));
  }
}
