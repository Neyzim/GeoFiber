import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL, apiUrl } from '../api-config';
import { SpliceRequest, SpliceResponse } from '../api-types';

/** Fusões (emendas) de uma caixa (`/boxes/{boxId}/splices`). */
@Injectable({ providedIn: 'root' })
export class SpliceApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  list(boxId: string): Observable<SpliceResponse[]> {
    return this.http.get<SpliceResponse[]>(apiUrl(this.base, 'boxes', boxId, 'splices'));
  }

  /** Registra a fusão na próxima posição livre da bandeja. */
  create(boxId: string, body: SpliceRequest): Observable<SpliceResponse> {
    return this.http.post<SpliceResponse>(apiUrl(this.base, 'boxes', boxId, 'splices'), body);
  }

  /** Desfaz a fusão e libera as pontas das fibras. */
  delete(boxId: string, spliceId: string): Observable<void> {
    return this.http.delete<void>(apiUrl(this.base, 'boxes', boxId, 'splices', spliceId));
  }
}
