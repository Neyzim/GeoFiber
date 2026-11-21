import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject } from 'rxjs';
import { TraceApi } from '../../core/api/resources/trace-api';
import { TraceDirection, TraceKind, TraceResponse } from '../../core/api/trace-types';
import { TraceStore } from './trace-store';

interface Call {
  kind: TraceKind;
  id: string;
  direction: TraceDirection;
  subject: Subject<TraceResponse>;
}

describe('TraceStore', () => {
  let store: TraceStore;
  let calls: Call[];

  beforeEach(() => {
    calls = [];
    const fake = {
      trace: (kind: TraceKind, id: string, direction: TraceDirection): Observable<TraceResponse> => {
        const subject = new Subject<TraceResponse>();
        calls.push({ kind, id, direction, subject });
        return subject.asObservable();
      },
    };
    TestBed.configureTestingModule({
      providers: [TraceStore, { provide: TraceApi, useValue: fake }],
    });
    store = TestBed.inject(TraceStore);
  });

  it('abre o caminho para cima: loading e depois ready', () => {
    store.open('BOX', 'b1');
    expect(store.state()).toBe('loading');
    expect(calls[0]).toMatchObject({ kind: 'BOX', id: 'b1', direction: 'UPSTREAM' });

    calls[0].subject.next({ status: 'REACHED_OLT', steps: [], breaks: [] });
    expect(store.state()).toBe('ready');
    expect(store.response()?.status).toBe('REACHED_OLT');
  });

  it('descarta a resposta de uma consulta anterior à atual', () => {
    store.open('BOX', 'b1');
    store.setDirection('DOWNSTREAM');

    calls[1].subject.next({ status: 'REACHED_CUSTOMERS', steps: [], breaks: [] });
    calls[0].subject.next({ status: 'REACHED_OLT', steps: [], breaks: [] });

    expect(store.response()?.status).toBe('REACHED_CUSTOMERS');
    expect(store.direction()).toBe('DOWNSTREAM');
  });

  it('mostra a frase de 404 quando o item não existe', () => {
    store.open('BOX', 'sumiu');
    calls[0].subject.error(new HttpErrorResponse({ status: 404 }));

    expect(store.state()).toBe('error');
    expect(store.error()).toBe('Não encontramos este item na rede.');
  });

  it('abre uma saída do splitter e volta para onde estava', () => {
    store.open('SPLITTER', 's1', 'DOWNSTREAM');
    calls[0].subject.next({ status: 'REACHED_CUSTOMERS', steps: [], breaks: [], branches: [] });

    store.openBranch('porta-2');
    expect(calls[1]).toMatchObject({ kind: 'SPLITTER_PORT', id: 'porta-2', direction: 'DOWNSTREAM' });
    expect(store.canGoBack()).toBe(true);

    store.back();
    expect(calls[2]).toMatchObject({ kind: 'SPLITTER', id: 's1', direction: 'DOWNSTREAM' });
    expect(store.canGoBack()).toBe(false);
  });

  it('close zera o estado', () => {
    store.open('FIBER', 'f1');
    store.close();
    expect(store.state()).toBe('idle');
    expect(store.response()).toBeNull();
  });
});
