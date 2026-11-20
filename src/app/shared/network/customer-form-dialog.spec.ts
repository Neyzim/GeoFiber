import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { parseApiError } from '../../core/api/api-error';
import { ServicePortApi } from '../../core/api/resources/service-port-api';
import { NetworkMapRepository } from '../../core/network/network-map-repository';
import { NotificationService } from '../../core/services/notification';
import { CustomerFormData, CustomerFormDialogComponent } from './customer-form-dialog';

function setup(data: CustomerFormData) {
  const repository = {
    boxes: signal([
      { id: 'b1', name: 'CTO-01', type: 'CTO', location: { longitude: -35.2, latitude: -5.8 } },
    ]),
    createCustomer: vi.fn((body: unknown) => of({ id: 'k1', ...(body as object) })),
    updateCustomer: vi.fn((_id: string, body: unknown) => of({ id: 'k1', ...(body as object) })),
  };
  const servicePortApi = {
    list: vi.fn(() =>
      of([
        { id: 'p1', portNumber: 1, status: 'FREE', splitterPortId: 's1' },
        { id: 'p2', portNumber: 2, status: 'FREE' },
      ]),
    ),
  };
  const dialogRef = { close: vi.fn(), disableClose: false };
  TestBed.configureTestingModule({
    imports: [CustomerFormDialogComponent],
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: MatDialogRef, useValue: dialogRef },
      { provide: NetworkMapRepository, useValue: repository },
      { provide: ServicePortApi, useValue: servicePortApi },
      {
        provide: NotificationService,
        useValue: { apiError: vi.fn((error: unknown) => parseApiError(error)) },
      },
    ],
  });
  const fixture = TestBed.createComponent(CustomerFormDialogComponent);
  fixture.detectChanges();
  return { component: fixture.componentInstance, fixture, repository, servicePortApi, dialogRef };
}

describe('CustomerFormDialogComponent', { timeout: 20000 }, () => {
  it('creates a customer at the clicked point with the chosen port', () => {
    const { component, repository, servicePortApi } = setup({
      mode: 'create',
      position: { lat: -5.8, lng: -35.2 },
    });
    component.form.patchValue({ name: 'Maria', contractCode: 'C-1' });
    component.form.controls.boxId.setValue('b1');
    expect(servicePortApi.list).toHaveBeenCalledWith('b1');
    component.form.controls.servicePortId.setValue('p1');
    component.submit();
    expect(repository.createCustomer).toHaveBeenCalledWith({
      name: 'Maria',
      contractCode: 'C-1',
      location: { longitude: -35.2, latitude: -5.8 },
      status: 'ACTIVE',
      servicePortId: 'p1',
    });
  });

  it('marks ports without signal as unavailable', () => {
    const { component } = setup({ mode: 'create', position: { lat: -5.8, lng: -35.2 } });
    component.form.controls.boxId.setValue('b1');
    expect(component.ports().map((port) => [port.id, port.available])).toEqual([
      ['p1', true],
      ['p2', false],
    ]);
  });

  it('does not send a port when the customer is cancelled', () => {
    const { component, repository, fixture } = setup({
      mode: 'edit',
      customer: {
        id: 'k1',
        name: 'Maria',
        contractCode: 'C-1',
        location: { longitude: -35.2, latitude: -5.8 },
        status: 'ACTIVE',
        servicePortId: 'p1',
        boxId: 'b1',
      },
    });
    component.form.controls.status.setValue('CANCELLED');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Porta de atendimento');
    component.submit();
    expect(repository.updateCustomer.mock.calls[0][1]).not.toHaveProperty('servicePortId');
  });
});
