import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api-config';
import { ImpactResponse } from '../impact-types';
import { ImpactApi } from './impact-api';
import { TEST_API } from '../../../../testing/api-endpoints';

describe('ImpactApi', () => {
  let api: ImpactApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: TEST_API },
      ],
    });
    api = TestBed.inject(ImpactApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('impact → GET /impact/{kind}/{id}', () => {
    let received: ImpactResponse | undefined;
    api.impact('cables', 'c1').subscribe((r) => (received = r));

    const req = httpMock.expectOne(`${TEST_API}/impact/cables/c1`);
    expect(req.request.method).toBe('GET');
    req.flush({ totals: { customers: 2, boxes: 1, olts: 0 }, truncated: false });

    expect(received?.totals?.customers).toBe(2);
  });
});
