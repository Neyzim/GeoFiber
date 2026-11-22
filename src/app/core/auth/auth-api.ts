import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL, apiUrl } from '../api/api-config';
import { LoginRequest, TokenResponse } from '../api/api-types';

/** Endpoints de autenticação (`/auth/*`). O cookie de refresh vai e volta pelo interceptor. */
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  login(body: LoginRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(apiUrl(this.base, 'auth', 'login'), body);
  }

  refresh(): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(apiUrl(this.base, 'auth', 'refresh'), null);
  }

  logout(): Observable<void> {
    return this.http.post<void>(apiUrl(this.base, 'auth', 'logout'), null);
  }
}
