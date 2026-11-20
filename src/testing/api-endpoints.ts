import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../app/core/api/api-config';

/** Base usada nos testes dos serviços da API. */
export const TEST_API = 'http://api.test/api/v1';

/** Um método de serviço e a requisição HTTP que ele deve fazer. */
export interface EndpointCase<T> {
  name: string;
  call: (api: T) => Observable<unknown>;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Caminho depois de `/api/v1`, ex.: `/boxes/b1`. */
  path: string;
  body?: unknown;
}

/** Gera um teste por endpoint: confere método, URL completa e corpo. */
export function describeEndpoints<T>(service: Type<T>, cases: readonly EndpointCase<T>[]): void {
  describe(service.name, () => {
    let api: T;
    let httpMock: HttpTestingController;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: API_BASE_URL, useValue: TEST_API },
        ],
      });
      api = TestBed.inject(service);
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    for (const testCase of cases) {
      it(`${testCase.name} → ${testCase.method} ${testCase.path}`, () => {
        let completed = false;
        testCase.call(api).subscribe(() => (completed = true));

        const req = httpMock.expectOne({ method: testCase.method, url: TEST_API + testCase.path });
        if (testCase.body !== undefined) {
          expect(req.request.body).toEqual(testCase.body);
        }
        req.flush(testCase.method === 'DELETE' ? null : {});
        expect(completed).toBe(true);
      });
    }
  });
}
