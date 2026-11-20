import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
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

describe('CustomerSheetComponent', { timeout: 20000 }, () => {
  it('explains the status, who serves the customer and the history, newest first', async () => {
    const { fixture } = await setup();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ativo: o cliente recebe o serviço');
    expect(text).toContain('Atendido pela CTO-01, porta 3.');
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
