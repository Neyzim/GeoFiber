import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL, apiUrl } from '../api-config';
import {
  AttachedCableResponse,
  OltPortRequest,
  OltPortResponse,
  OltRequest,
  OltResponse,
} from '../api-types';

/** OLTs e suas portas PON (`/olts`). */
@Injectable({ providedIn: 'root' })
export class OltApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  list(): Observable<OltResponse[]> {
    return this.http.get<OltResponse[]>(apiUrl(this.base, 'olts'));
  }

  get(id: string): Observable<OltResponse> {
    return this.http.get<OltResponse>(apiUrl(this.base, 'olts', id));
  }

  create(body: OltRequest): Observable<OltResponse> {
    return this.http.post<OltResponse>(apiUrl(this.base, 'olts'), body);
  }

  update(id: string, body: OltRequest): Observable<OltResponse> {
    return this.http.put<OltResponse>(apiUrl(this.base, 'olts', id), body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(apiUrl(this.base, 'olts', id));
  }

  listPorts(oltId: string): Observable<OltPortResponse[]> {
    return this.http.get<OltPortResponse[]>(apiUrl(this.base, 'olts', oltId, 'ports'));
  }

  createPort(oltId: string, body: OltPortRequest): Observable<OltPortResponse> {
    return this.http.post<OltPortResponse>(apiUrl(this.base, 'olts', oltId, 'ports'), body);
  }

  updatePort(oltId: string, portId: string, body: OltPortRequest): Observable<OltPortResponse> {
    return this.http.put<OltPortResponse>(apiUrl(this.base, 'olts', oltId, 'ports', portId), body);
  }

  deletePort(oltId: string, portId: string): Observable<void> {
    return this.http.delete<void>(apiUrl(this.base, 'olts', oltId, 'ports', portId));
  }

  /** Cabos que têm a OLT na sua lista de elementos. */
  listCables(oltId: string): Observable<AttachedCableResponse[]> {
    return this.http.get<AttachedCableResponse[]>(apiUrl(this.base, 'olts', oltId, 'cables'));
  }
}
