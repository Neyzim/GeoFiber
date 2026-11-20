import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { parseApiError } from '../../core/api/api-error';
import { NetworkMapRepository } from '../../core/network/network-map-repository';
import { NotificationService } from '../../core/services/notification';
import { BoxFormData, BoxFormDialogComponent } from './box-form-dialog';

function setup(data: BoxFormData, createBox = vi.fn(() => of({ id: 'b1' }))) {
  const close = vi.fn();
  const repository = { createBox, updateBox: vi.fn(() => of({ id: 'b1' })) };
  const notifications = {
    apiError: vi.fn((error: unknown) => parseApiError(error)),
    success: vi.fn(),
  };
  TestBed.configureTestingModule({
    imports: [BoxFormDialogComponent],
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: MatDialogRef, useValue: { close } },
      { provide: NetworkMapRepository, useValue: repository },
      { provide: NotificationService, useValue: notifications },
    ],
  });
  const component = TestBed.createComponent(BoxFormDialogComponent).componentInstance;
  return { component, close, repository };
}

const position = { lat: -5.8, lng: -35.2 };

describe('BoxFormDialogComponent', () => {
  it('sends service ports for a CTO', () => {
    const { component, repository, close } = setup({ mode: 'create', position, type: 'CTO' });
    component.form.patchValue({ name: 'CTO-01', powerCapacity: 8 });
    component.submit();
    expect(repository.createBox).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'CTO-01',
        type: 'CTO',
        powerCapacity: 8,
        location: { longitude: -35.2, latitude: -5.8 },
      }),
    );
    expect(close).toHaveBeenCalledWith({ id: 'b1' });
  });

  it('never sends service ports for a CEO', () => {
    const { component, repository } = setup({ mode: 'create', position, type: 'CEO' });
    component.form.patchValue({ name: 'CEO-01', powerCapacity: 8 });
    component.submit();
    const body = (repository.createBox.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(body['type']).toBe('CEO');
    expect('powerCapacity' in body).toBe(false);
  });

  it('keeps the dialog open and marks the field when the server rejects it', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { detail: 'Validation failed', errors: [{ field: 'name', message: 'obrigatório' }] },
    });
    const { component, close } = setup(
      { mode: 'create', position, type: 'CTO' },
      vi.fn(() => throwError(() => error)),
    );
    component.form.patchValue({ name: 'X' });
    component.submit();
    expect(component.form.get('name')?.errors?.['api']).toBe('obrigatório');
    expect(close).not.toHaveBeenCalled();
  });
});
