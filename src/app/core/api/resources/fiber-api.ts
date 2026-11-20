import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL, apiUrl } from '../api-config';
import { FiberRequest, FiberResponse, FiberStatusRequest } from '../api-types';

/** Fibras de um tubo (`/tubes/{tubeId}/fibers`). */
@Injectable({ providedIn: 'root' })
export class FiberApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  list(tubeId: string): Observable<FiberResponse[]> {
    return this.http.get<FiberResponse[]>(apiUrl(this.base, 'tubes', tubeId, 'fibers'));
  }

  create(tubeId: string, body: FiberRequest): Observable<FiberResponse> {
    return this.http.post<FiberResponse>(apiUrl(this.base, 'tubes', tubeId, 'fibers'), body);
  }

  update(tubeId: string, fiberId: string, body: FiberRequest): Observable<FiberResponse> {
    return this.http.put<FiberResponse>(apiUrl(this.base, 'tubes', tubeId, 'fibers', fiberId), body);
  }

  delete(tubeId: string, fiberId: string): Observable<void> {
    return this.http.delete<void>(apiUrl(this.base, 'tubes', tubeId, 'fibers', fiberId));
  }

  /** Marca a fibra como AVAILABLE, BROKEN ou RESERVED (só desconectada). */
  setStatus(tubeId: string, fiberId: string, body: FiberStatusRequest): Observable<FiberResponse> {
    return this.http.put<FiberResponse>(
      apiUrl(this.base, 'tubes', tubeId, 'fibers', fiberId, 'status'),
      body,
    );
  }
}
