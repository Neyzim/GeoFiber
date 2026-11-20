import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL, apiUrl } from '../api-config';
import {
  SplitterPortResponse,
  SplitterPortUpdateRequest,
  SplitterRequest,
  SplitterResponse,
} from '../api-types';

/** Splitters de uma caixa e suas portas. */
@Injectable({ providedIn: 'root' })
export class SplitterApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  list(boxId: string): Observable<SplitterResponse[]> {
    return this.http.get<SplitterResponse[]>(apiUrl(this.base, 'boxes', boxId, 'splitters'));
  }

  /** Em CTO, gera por padrão uma porta de atendimento por saída. */
  create(boxId: string, body: SplitterRequest): Observable<SplitterResponse> {
    return this.http.post<SplitterResponse>(apiUrl(this.base, 'boxes', boxId, 'splitters'), body);
  }

  /** Só o balanceamento é editável; a razão é imutável. */
  update(boxId: string, splitterId: string, body: SplitterRequest): Observable<SplitterResponse> {
    return this.http.put<SplitterResponse>(
      apiUrl(this.base, 'boxes', boxId, 'splitters', splitterId),
      body,
    );
  }

  delete(boxId: string, splitterId: string): Observable<void> {
    return this.http.delete<void>(apiUrl(this.base, 'boxes', boxId, 'splitters', splitterId));
  }

  updatePort(
    splitterId: string,
    portId: string,
    body: SplitterPortUpdateRequest,
  ): Observable<SplitterPortResponse> {
    return this.http.put<SplitterPortResponse>(
      apiUrl(this.base, 'splitters', splitterId, 'ports', portId),
      body,
    );
  }
}
