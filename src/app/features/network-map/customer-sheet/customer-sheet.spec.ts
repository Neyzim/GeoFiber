import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { CustomerResponse } from '../../../core/api/api-types';
import { CustomerApi } from '../../../core/api/resources/customer-api';
import { ServicePortApi } from '../../../core/api/resources/service-port-api';
import { MapElement } from '../../../core/network/map-element';
import { NetworkMapRepository } from '../../../core/network/network-map-repository';
import { NotificationService } from '../../../core/services/notification';
import { CustomerSheetComponent } from './customer-sheet';

const customer: CustomerResponse = {
  id: 'k1',
  name: 'Maria',
  contractCode: 'C-1',
  location: { longitude: -35.2, latitude: -5.8 },
  status: 'ACTIVE',
  servicePortId: 'p1',
  boxId: 'b1',
};

async function setup(confirmed = true) {
  const repository = {
    customers: signal([customer]),
    findCustomer: (id: string) => (id === 'k1' ? customer : undefined),
    findBox: () => ({ id: 'b1', name: 'CTO-01' }),
    updateCustomer: vi.fn((_id: string, body: object) => of({ ...customer, ...body })),
    deleteCustomer: vi.fn(() => of(undefined)),
  };
  const dialog = { open: vi.fn(() => ({ afterClosed: () => of(confirmed) })) };
  TestBed.configureTestingModule({
    imports: [CustomerSheetComponent],
    providers: [
      { provide: NetworkMapRepository, useValue: repository },
      { provide: MatDialog, useValue: dialog },
      {
        provide: CustomerApi,
        useValue: {
          history: vi.fn(() =>
            of([
              { status: 'ACTIVE', servicePortId: 'p1', changedAt: '2026-11-19T10:00:00Z' },
              { status: 'BLOCKED', servicePortId: 'p1', changedAt: '2026-11-19T12:00:00Z' },
            ]),
          ),
        },
      },
      { provide: ServicePortApi, useValue: { list: vi.fn(() => of([{ id: 'p1', portNumber: 3 }])) } },
      { provide: NotificationService, useValue: { success: vi.fn(), apiError: vi.fn() } },
    ],
  });
  const fixture = TestBed.createComponent(CustomerSheetComponent);
  fixture.componentRef.setInput('element', {
    key: 'customer:k1',
    kind: 'customer',
    id: 'k1',
    group: 'customer',
    name: 'Maria',
    status: 'ACTIVE',
    position: { lat: -5.8, lng: -35.2 },
    details: [],
  } satisfies MapElement);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, repository, dialog, component: fixture.componentInstance };
}

function clickTab(fixture: ComponentFixture<CustomerSheetComponent>, id: string): void {
  const tab = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`[data-tab="${id}"]`);
  tab?.click();
  fixture.detectChanges();
}

describe('CustomerSheetComponent', { timeout: 20000 }, () => {
  it('shows Resumo and Histórico tabs', async () => {
    const { fixture } = await setup();
    const tabs = (fixture.nativeElement as HTMLElement).querySelectorAll('[role="tab"]');
    expect(Array.from(tabs).map((tab) => tab.textContent?.trim())).toEqual(['Resumo', 'Histórico']);
  });

  it('unifilar shows CTO name and port, with Ponto final as outgoing', async () => {
    const { fixture } = await setup();
    const host = fixture.nativeElement as HTMLElement;
    const group = host.querySelector('app-unifilar-summary [role="group"]');
    expect(group?.getAttribute('aria-label')).toContain('Chega: CTO-01 · porta 3');
    expect(host.textContent).toContain('Ponto final');
  });

  it('shows the history section only on the Histórico tab', async () => {
    const { fixture } = await setup();
    const host = fixture.nativeElement as HTMLElement;
    const headings = () => Array.from(host.querySelectorAll('h3')).map((h) => h.textContent?.trim());
    expect(headings()).not.toContain('Histórico');
    clickTab(fixture, 'historico');
    expect(headings()).toContain('Histórico');
    expect(host.textContent).toContain('Bloqueado, com porta');
  });

  it('switching customers returns to Resumo', async () => {
    const { fixture } = await setup();
    clickTab(fixture, 'historico');
    fixture.componentRef.setInput('element', {
      ...fixture.componentInstance.element(),
      id: 'k2',
      key: 'customer:k2',
    });
    fixture.detectChanges();
    const resumo = (fixture.nativeElement as HTMLElement).querySelector('[data-tab="resumo"]');
    expect(resumo?.getAttribute('aria-selected')).toBe('true');
  });

  it('explains the status, who serves the customer and the history, newest first', async () => {
    const { fixture } = await setup();
    const host = fixture.nativeElement as HTMLElement;
    const resumo = host.textContent ?? '';
    expect(resumo).toContain('Ativo: o cliente recebe o serviço');
    expect(resumo).toContain('Atendido pela CTO-01, porta 3.');
    clickTab(fixture, 'historico');
    const text = host.textContent ?? '';
    expect(text.indexOf('Bloqueado, com porta')).toBeLessThan(text.indexOf('Ativo, com porta'));
  });

  it('cancels after confirmation without sending the port', async () => {
    const { component, repository, dialog } = await setup();
    component.changeStatus('CANCELLED');
    expect(dialog.open).toHaveBeenCalled();
    const body = repository.updateCustomer.mock.calls[0][1];
    expect(body).toMatchObject({ status: 'CANCELLED', name: 'Maria' });
    expect(body).not.toHaveProperty('servicePortId');
  });

  it('asks for the form when reactivating a cancelled customer', async () => {
    const { component, repository } = await setup();
    const reactivate = vi.fn();
    component.reactivate.subscribe(reactivate);
    repository.customers.set([{ ...customer, status: 'CANCELLED', servicePortId: undefined }]);
    repository.findCustomer = () => ({ ...customer, status: 'CANCELLED', servicePortId: undefined });
    component.changeStatus('ACTIVE');
    expect(reactivate).toHaveBeenCalled();
    expect(repository.updateCustomer).not.toHaveBeenCalled();
  });
});
