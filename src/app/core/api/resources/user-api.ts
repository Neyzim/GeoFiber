import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL, apiUrl } from '../api-config';
import { CreateUserRequest, ResetPasswordRequest, SetActiveRequest, UserResponse } from '../api-types';

/** Usuários (`/users`), só para administradores. */
@Injectable({ providedIn: 'root' })
export class UserApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  /** Todos os usuários, ativos e desativados, por nome. */
  list(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(apiUrl(this.base, 'users'));
  }

  create(body: CreateUserRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(apiUrl(this.base, 'users'), body);
  }

  /** Desativar encerra as sessões da pessoa no backend. */
  setActive(id: string, active: boolean): Observable<UserResponse> {
    const body: SetActiveRequest = { active };
    return this.http.patch<UserResponse>(apiUrl(this.base, 'users', id, 'active'), body);
  }

  /** Troca a senha e encerra as sessões abertas com a antiga. */
  resetPassword(id: string, password: string): Observable<void> {
    const body: ResetPasswordRequest = { password };
    return this.http.put<void>(apiUrl(this.base, 'users', id, 'password'), body);
  }
}
