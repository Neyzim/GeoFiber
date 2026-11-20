import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL, apiUrl } from '../api-config';
import { CustomerHistoryResponse, CustomerRequest, CustomerResponse } from '../api-types';

/** Clientes e seu histórico (`/customers`). */
@Injectable({ providedIn: 'root' })
export class CustomerApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  list(): Observable<CustomerResponse[]> {
    return this.http.get<CustomerResponse[]>(apiUrl(this.base, 'customers'));
  }

  get(id: string): Observable<CustomerResponse> {
    return this.http.get<CustomerResponse>(apiUrl(this.base, 'customers', id));
  }

  create(body: CustomerRequest): Observable<CustomerResponse> {
    return this.http.post<CustomerResponse>(apiUrl(this.base, 'customers'), body);
  }

  update(id: string, body: CustomerRequest): Observable<CustomerResponse> {
    return this.http.put<CustomerResponse>(apiUrl(this.base, 'customers', id), body);
  }

  /** Só para cadastro feito por engano (apaga o histórico). Para encerrar contrato use CANCELLED. */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(apiUrl(this.base, 'customers', id));
  }

  /** Mudanças de situação e de porta, da mais antiga à mais recente. */
  history(id: string): Observable<CustomerHistoryResponse[]> {
    return this.http.get<CustomerHistoryResponse[]>(apiUrl(this.base, 'customers', id, 'history'));
  }
}
