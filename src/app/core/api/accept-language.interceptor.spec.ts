import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { acceptLanguageInterceptor } from './accept-language.interceptor';
import { API_BASE_URL, apiUrl } from './api-config';

describe('acceptLanguageInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([acceptLanguageInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test/api/v1' },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('adds Accept-Language to API requests', () => {
    http.get('http://api.test/api/v1/olts').subscribe();
    const req = httpMock.expectOne('http://api.test/api/v1/olts');
    expect(req.request.headers.get('Accept-Language')).toBe('pt-BR');
    req.flush([]);
  });

  it('leaves other hosts untouched', () => {
    http.get('https://tile.openstreetmap.org/1/1/1.png').subscribe();
    const req = httpMock.expectOne('https://tile.openstreetmap.org/1/1/1.png');
    expect(req.request.headers.get('Accept-Language')).toBeNull();
    req.flush('');
  });
});

describe('apiUrl', () => {
  it('encodes segments', () => {
    expect(apiUrl('http://x/api/v1', 'boxes', 'a b', 'trays')).toBe(
      'http://x/api/v1/boxes/a%20b/trays',
    );
  });
});
