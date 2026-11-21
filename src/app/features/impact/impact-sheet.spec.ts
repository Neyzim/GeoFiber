import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { ImpactResponse, ImpactKind } from '../../core/api/impact-types';
import { ImpactApi } from '../../core/api/resources/impact-api';
import { ImpactSheetComponent } from './impact-sheet';
import { ImpactStore } from './impact-store';

describe('ImpactSheetComponent', { timeout: 20000 }, () => {
  let fixture: ComponentFixture<ImpactSheetComponent>;
  let answer: () => Observable<ImpactResponse>;

  function render(source: () => Observable<ImpactResponse>) {
    answer = source;
    TestBed.configureTestingModule({
      imports: [ImpactSheetComponent],
      providers: [
        ImpactStore,
        { provide: ImpactApi, useValue: { impact: (_kind: ImpactKind, _id: string) => answer() } },
      ],
    });
    fixture = TestBed.createComponent(ImpactSheetComponent);
    fixture.componentInstance.store.open('cables', 'c1');
    fixture.detectChanges();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const sample: ImpactResponse = {
    target: { kind: 'CABLE', id: 'c1', label: 'CABO-01' },
    totals: { customers: 3, boxes: 2, olts: 1 },
    boxes: [
      {
        id: 'b1',
        label: 'CTO-002',
        customers: [
          { id: 'k1', name: 'Maria' },
          { id: 'k2', name: null as never },
        ],
      },
      { id: 'b2', label: 'CTO-003', customers: [{ id: 'k3', name: 'João' }] },
    ],
    olts: [{ id: 'o1', label: 'OLT-CENTRAL' }],
    truncated: false,
  };

  it('mostra o resumo, as contagens e a lista agrupada por caixa', () => {
    render(() => of(sample));

    expect(el().querySelector('[data-summary]')?.textContent).toContain(
      'Se este cabo sair, 3 clientes ficam sem sinal, em 2 caixas.',
    );
    expect(el().querySelector('[data-totals]')?.textContent).toContain('3 clientes · 2 caixas · 1 OLT');
    const boxes = Array.from(el().querySelectorAll('[data-box]')).map((b) => b.textContent?.trim());
    expect(boxes).toEqual(['CTO-002', 'CTO-003']);
    const customers = Array.from(el().querySelectorAll('[data-customer]')).map((c) => c.textContent?.trim());
    expect(customers).toEqual(['Maria', '(sem nome)', 'João']);
  });

  it('clicar numa caixa emite o id dela', () => {
    render(() => of(sample));
    let ids: string[] = [];
    fixture.componentInstance.focusBox.subscribe((id) => ids.push(id));

    (el().querySelectorAll('[data-box]')[1] as HTMLElement).click();
    expect(ids).toEqual(['b2']);
  });

  it('sem clientes, diz que nenhum depende do item e não mostra lista', () => {
    render(() => of({ target: { kind: 'OLT' }, totals: { customers: 0, boxes: 0, olts: 0 }, boxes: [], olts: [], truncated: false }));

    expect(el().querySelector('[data-summary]')?.textContent).toContain('Nenhum cliente depende deste item.');
    expect(el().querySelectorAll('[data-box]').length).toBe(0);
  });

  it('avisa quando a lista foi cortada e mantém o total real', () => {
    render(() =>
      of({ target: { kind: 'CABLE' }, totals: { customers: 2001, boxes: 1, olts: 0 }, boxes: [], olts: [], truncated: true }),
    );
    expect(el().querySelector('[data-truncated]')?.textContent).toContain(
      'Mostrando os primeiros 2000 clientes; o total é 2001.',
    );
  });

  it('mostra a frase de erro do store quando o item não existe', () => {
    render(() => throwError(() => new HttpErrorResponse({ status: 404 })));
    expect(el().querySelector('[role="alert"]')?.textContent).toContain('Não encontramos este item na rede.');
  });
});
