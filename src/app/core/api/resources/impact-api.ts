import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL, apiUrl } from '../api-config';
import { ImpactKind, ImpactResponse } from '../impact-types';

/** Impacto de manutenção: quem fica sem sinal se o item sair ou parar. Só leitura. */
@Injectable({ providedIn: 'root' })
export class ImpactApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  impact(kind: ImpactKind, id: string): Observable<ImpactResponse> {
    return this.http.get<ImpactResponse>(apiUrl(this.base, 'impact', kind, id));
  }
}
