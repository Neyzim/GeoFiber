import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL, apiUrl } from '../api-config';
import { TraceDirection, TraceKind, TraceResponse } from '../trace-types';

/** Rastreio da fibra: só leitura, o backend calcula o caminho. */
@Injectable({ providedIn: 'root' })
export class TraceApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  trace(kind: TraceKind, id: string, direction: TraceDirection): Observable<TraceResponse> {
    const params = new HttpParams().set('direction', direction);
    return this.http.get<TraceResponse>(apiUrl(this.base, 'trace', kind, id), { params });
  }
}
