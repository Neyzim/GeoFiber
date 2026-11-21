import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api-config';
import { TraceResponse } from '../trace-types';
import { TraceApi } from './trace-api';
import { TEST_API } from '../../../../testing/api-endpoints';

describe('TraceApi', () => {
  let api: TraceApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: TEST_API },
      ],
    });
    api = TestBed.inject(TraceApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('trace → GET /trace/{kind}/{id}?direction=…', () => {
    let received: TraceResponse | undefined;
    api.trace('SPLITTER_PORT', 'p1', 'DOWNSTREAM').subscribe((r) => (received = r));

    const req = httpMock.expectOne(
      (r) => r.method === 'GET' && r.urlWithParams === `${TEST_API}/trace/SPLITTER_PORT/p1?direction=DOWNSTREAM`,
    );
    req.flush({ status: 'EMPTY', steps: [], breaks: [] });

    expect(received?.status).toBe('EMPTY');
  });
});
