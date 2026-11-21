import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject } from 'rxjs';
import { ImpactApi } from '../../core/api/resources/impact-api';
import { ImpactKind, ImpactResponse } from '../../core/api/impact-types';
import { ImpactStore } from './impact-store';

interface Call {
  kind: ImpactKind;
  id: string;
  subject: Subject<ImpactResponse>;
}

describe('ImpactStore', () => {
  let store: ImpactStore;
  let calls: Call[];

  beforeEach(() => {
    calls = [];
    const fake = {
      impact: (kind: ImpactKind, id: string): Observable<ImpactResponse> => {
        const subject = new Subject<ImpactResponse>();
        calls.push({ kind, id, subject });
        return subject.asObservable();
      },
    };
    TestBed.configureTestingModule({
      providers: [ImpactStore, { provide: ImpactApi, useValue: fake }],
    });
    store = TestBed.inject(ImpactStore);
  });

  it('abre o impacto: loading e depois ready', () => {
    store.open('cables', 'c1');
    expect(store.state()).toBe('loading');
    expect(calls[0]).toMatchObject({ kind: 'cables', id: 'c1' });

    calls[0].subject.next({ totals: { customers: 2, boxes: 1, olts: 0 }, truncated: false });
    expect(store.state()).toBe('ready');
    expect(store.response()?.totals?.customers).toBe(2);
  });

  it('descarta a resposta de um item anterior ao atual', () => {
    store.open('cables', 'c1');
    store.open('boxes', 'b1');

    calls[1].subject.next({ totals: { customers: 5, boxes: 0, olts: 0 } });
    calls[0].subject.next({ totals: { customers: 99, boxes: 0, olts: 0 } });

    expect(store.response()?.totals?.customers).toBe(5);
    expect(store.query()).toEqual({ kind: 'boxes', id: 'b1' });
  });

  it('404 vira a frase de item não encontrado; outro erro vira a frase geral', () => {
    store.open('olts', 'sumiu');
    calls[0].subject.error(new HttpErrorResponse({ status: 404 }));
    expect(store.state()).toBe('error');
    expect(store.error()).toBe('Não encontramos este item na rede.');

    store.open('olts', 'o2');
    calls[1].subject.error(new HttpErrorResponse({ status: 500 }));
    expect(store.error()).toBe('Não foi possível calcular o impacto agora. Tente de novo.');
  });

  it('close zera o estado', () => {
    store.open('boxes', 'b1');
    store.close();
    expect(store.state()).toBe('idle');
    expect(store.query()).toBeNull();
    expect(store.response()).toBeNull();
  });
});
