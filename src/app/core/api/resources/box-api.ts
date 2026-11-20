import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL, apiUrl } from '../api-config';
import {
  AttachedCableResponse,
  BoxOverviewResponse,
  BoxRequest,
  BoxResponse,
} from '../api-types';

/** Caixas CTO, CEO e DIO (`/boxes`). */
@Injectable({ providedIn: 'root' })
export class BoxApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  list(): Observable<BoxResponse[]> {
    return this.http.get<BoxResponse[]>(apiUrl(this.base, 'boxes'));
  }

  get(id: string): Observable<BoxResponse> {
    return this.http.get<BoxResponse>(apiUrl(this.base, 'boxes', id));
  }

  create(body: BoxRequest): Observable<BoxResponse> {
    return this.http.post<BoxResponse>(apiUrl(this.base, 'boxes'), body);
  }

  update(id: string, body: BoxRequest): Observable<BoxResponse> {
    return this.http.put<BoxResponse>(apiUrl(this.base, 'boxes', id), body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(apiUrl(this.base, 'boxes', id));
  }

  /** Cabos que têm a caixa na sua lista de elementos. */
  listCables(boxId: string): Observable<AttachedCableResponse[]> {
    return this.http.get<AttachedCableResponse[]>(apiUrl(this.base, 'boxes', boxId, 'cables'));
  }

  /** Tudo o que está dentro da caixa numa única resposta. */
  overview(boxId: string): Observable<BoxOverviewResponse> {
    return this.http.get<BoxOverviewResponse>(apiUrl(this.base, 'boxes', boxId, 'overview'));
  }
}
