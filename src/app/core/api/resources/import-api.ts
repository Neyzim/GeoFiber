import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL, apiUrl } from '../api-config';
import { ImportNetworkRequest, ImportNetworkResponse } from '../import-types';

/** Importação de rede (KMZ/KML): grava a lista pronta numa transação só. */
@Injectable({ providedIn: 'root' })
export class ImportApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  importNetwork(body: ImportNetworkRequest): Observable<ImportNetworkResponse> {
    return this.http.post<ImportNetworkResponse>(apiUrl(this.base, 'imports', 'network'), body);
  }
}
