import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL, apiUrl } from '../api-config';
import { ServicePortRequest, ServicePortResponse } from '../api-types';

/** Portas de atendimento de uma CTO (`/boxes/{boxId}/service-ports`). */
@Injectable({ providedIn: 'root' })
export class ServicePortApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  list(boxId: string): Observable<ServicePortResponse[]> {
    return this.http.get<ServicePortResponse[]>(apiUrl(this.base, 'boxes', boxId, 'service-ports'));
  }

  create(boxId: string, body: ServicePortRequest): Observable<ServicePortResponse> {
    return this.http.post<ServicePortResponse>(
      apiUrl(this.base, 'boxes', boxId, 'service-ports'),
      body,
    );
  }

  update(boxId: string, portId: string, body: ServicePortRequest): Observable<ServicePortResponse> {
    return this.http.put<ServicePortResponse>(
      apiUrl(this.base, 'boxes', boxId, 'service-ports', portId),
      body,
    );
  }

  delete(boxId: string, portId: string): Observable<void> {
    return this.http.delete<void>(apiUrl(this.base, 'boxes', boxId, 'service-ports', portId));
  }
}
