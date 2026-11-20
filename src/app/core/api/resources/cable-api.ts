import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL, apiUrl } from '../api-config';
import {
  CableAttachmentRequest,
  CableAttachmentResponse,
  CableRequest,
  CableResponse,
  CableFiberResponse,
  CableStructureRequest,
  CableStructureResponse,
  LooseTubeRequest,
  LooseTubeResponse,
} from '../api-types';

/** Cabos, seus tubos loose e a lista de elementos por onde passam (`/cables`). */
@Injectable({ providedIn: 'root' })
export class CableApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  list(): Observable<CableResponse[]> {
    return this.http.get<CableResponse[]>(apiUrl(this.base, 'cables'));
  }

  get(id: string): Observable<CableResponse> {
    return this.http.get<CableResponse>(apiUrl(this.base, 'cables', id));
  }

  create(body: CableRequest): Observable<CableResponse> {
    return this.http.post<CableResponse>(apiUrl(this.base, 'cables'), body);
  }

  update(id: string, body: CableRequest): Observable<CableResponse> {
    return this.http.put<CableResponse>(apiUrl(this.base, 'cables', id), body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(apiUrl(this.base, 'cables', id));
  }

  listTubes(cableId: string): Observable<LooseTubeResponse[]> {
    return this.http.get<LooseTubeResponse[]>(apiUrl(this.base, 'cables', cableId, 'tubes'));
  }

  createTube(cableId: string, body: LooseTubeRequest): Observable<LooseTubeResponse> {
    return this.http.post<LooseTubeResponse>(apiUrl(this.base, 'cables', cableId, 'tubes'), body);
  }

  updateTube(cableId: string, tubeId: string, body: LooseTubeRequest): Observable<LooseTubeResponse> {
    return this.http.put<LooseTubeResponse>(
      apiUrl(this.base, 'cables', cableId, 'tubes', tubeId),
      body,
    );
  }

  deleteTube(cableId: string, tubeId: string): Observable<void> {
    return this.http.delete<void>(apiUrl(this.base, 'cables', cableId, 'tubes', tubeId));
  }

  listAttachments(cableId: string): Observable<CableAttachmentResponse[]> {
    return this.http.get<CableAttachmentResponse[]>(
      apiUrl(this.base, 'cables', cableId, 'attachments'),
    );
  }

  /** Substitui a lista inteira (START, PASS_THROUGH..., END). */
  setAttachments(
    cableId: string,
    body: CableAttachmentRequest[],
  ): Observable<CableAttachmentResponse[]> {
    return this.http.put<CableAttachmentResponse[]>(
      apiUrl(this.base, 'cables', cableId, 'attachments'),
      body,
    );
  }

  /** Cria tubos e fibras numa única transação (tudo ou nada). */
  createStructure(cableId: string, body: CableStructureRequest): Observable<CableStructureResponse> {
    return this.http.post<CableStructureResponse>(
      apiUrl(this.base, 'cables', cableId, 'structure'),
      body,
    );
  }

  /** Todas as fibras do cabo, com o tubo e a ligação de cada ponta. */
  listFibers(cableId: string): Observable<CableFiberResponse[]> {
    return this.http.get<CableFiberResponse[]>(apiUrl(this.base, 'cables', cableId, 'fibers'));
  }
}
