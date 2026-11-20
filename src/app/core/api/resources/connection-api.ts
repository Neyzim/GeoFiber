import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL, apiUrl } from '../api-config';
import { ConnectionRequest, ConnectionResponse } from '../api-types';

/** Conexões por conector dentro de uma caixa (`/boxes/{boxId}/connections`). */
@Injectable({ providedIn: 'root' })
export class ConnectionApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  list(boxId: string): Observable<ConnectionResponse[]> {
    return this.http.get<ConnectionResponse[]>(apiUrl(this.base, 'boxes', boxId, 'connections'));
  }

  create(boxId: string, body: ConnectionRequest): Observable<ConnectionResponse> {
    return this.http.post<ConnectionResponse>(
      apiUrl(this.base, 'boxes', boxId, 'connections'),
      body,
    );
  }

  delete(boxId: string, connectionId: string): Observable<void> {
    return this.http.delete<void>(apiUrl(this.base, 'boxes', boxId, 'connections', connectionId));
  }
}
