import { parseApiError } from '../../core/api/api-error';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject, of } from 'rxjs';
import { NetworkMapRepository } from '../../core/network/network-map-repository';
import { NotificationService } from '../../core/services/notification';
import { CableFormData, CableFormDialogComponent } from './cable-form-dialog';

function setup(data: CableFormData) {
  const close = vi.fn();
  const dialogRef = { close, disableClose: false };
  const repository = {
    createCable: vi.fn(() => of({ cable: { id: 'c1' }, attachmentsSaved: true as boolean | null })),
    updateCable: vi.fn(() => of({ id: 'c1' })),
  };
  const notifications = {
    apiError: vi.fn((error: unknown) => parseApiError(error)),
    warning: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  };
  TestBed.configureTestingModule({
    imports: [CableFormDialogComponent],
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: MatDialogRef, useValue: dialogRef },
      { provide: NetworkMapRepository, useValue: repository },
      { provide: NotificationService, useValue: notifications },
    ],
  });
  const component = TestBed.createComponent(CableFormDialogComponent).componentInstance;
  return { component, close, dialogRef, repository, notifications };
}

const create: CableFormData = {
  mode: 'create',
  points: [
    { lat: 1, lng: 2 },
    { lat: 3, lng: 4 },
  ],
  role: 'FEEDER',
  start: { ref: { kind: 'olt', id: 'o1' }, name: 'OLT-CENTRO' },
  end: { ref: { kind: 'box', id: 'b1' }, name: 'CEO-01' },
};

describe('CableFormDialogComponent', () => {
  it('creates the cable with both ends when both are checked', () => {
    const { component, repository, close } = setup(create);
    component.form.patchValue({ name: 'AL-01', fiberCapacity: 12 });
    component.submit();
    expect(repository.createCable).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'AL-01',
        role: 'FEEDER',
        fiberCapacity: 12,
        coordinates: [
          { longitude: 2, latitude: 1 },
          { longitude: 4, latitude: 3 },
        ],
      }),
      { start: { kind: 'olt', id: 'o1' }, end: { kind: 'box', id: 'b1' } },
    );
    expect(close).toHaveBeenCalledWith({ id: 'c1' });
  });

  it('leaves out an unchecked end and tells the user', () => {
    const { component, repository, notifications } = setup(create);
    component.form.patchValue({ name: 'AL-01', fiberCapacity: 12, useEnd: false });
    component.submit();
    expect((repository.createCable.mock.calls[0] as unknown[])[1]).toEqual({
      start: { kind: 'olt', id: 'o1' },
    });
    expect(notifications.info).toHaveBeenCalledWith(
      'Cabo salvo. Defina início e fim na ficha do cabo (Etapa 2).',
    );
  });

  it('warns when the start/end list could not be saved', () => {
    const { component, repository, notifications } = setup(create);
    repository.createCable.mockReturnValue(of({ cable: { id: 'c1' }, attachmentsSaved: false }));
    component.form.patchValue({ name: 'AL-01', fiberCapacity: 12 });
    component.submit();
    expect(notifications.warning).toHaveBeenCalledWith(
      'Cabo salvo, mas a lista de início/fim não foi gravada.',
    );
  });

  it('updates an existing cable without touching its ends', () => {
    const { component, repository } = setup({
      mode: 'edit',
      cable: {
        id: 'c1',
        name: 'AL-01',
        role: 'FEEDER',
        usageStatus: 'ACTIVE',
        fiberCapacity: 12,
        coordinates: [
          { longitude: 2, latitude: 1 },
          { longitude: 4, latitude: 3 },
        ],
      },
    });
    component.form.patchValue({ name: 'AL-02' });
    component.submit();
    expect(repository.createCable).not.toHaveBeenCalled();
    expect(repository.updateCable).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ name: 'AL-02', coordinates: expect.any(Array) }),
    );
    const body = (repository.updateCable.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect('attachments' in body).toBe(false);
  });
});

describe('CableFormDialogComponent while saving', () => {
  it('cannot be dismissed until the server answers', () => {
    const { component, repository, dialogRef, close } = setup(create);
    const pending = new Subject<{ cable: { id: string }; attachmentsSaved: boolean | null }>();
    repository.createCable.mockReturnValue(pending);
    component.form.patchValue({ name: 'AL-01', fiberCapacity: 12 });
    component.submit();
    expect(dialogRef.disableClose).toBe(true);
    pending.next({ cable: { id: 'c1' }, attachmentsSaved: true });
    pending.complete();
    expect(close).toHaveBeenCalledWith({ id: 'c1' });
  });

  it('can be dismissed again after an error', () => {
    const { component, repository, dialogRef } = setup(create);
    const pending = new Subject<{ cable: { id: string }; attachmentsSaved: boolean | null }>();
    repository.createCable.mockReturnValue(pending);
    component.form.patchValue({ name: 'AL-01', fiberCapacity: 12 });
    component.submit();
    pending.error(new Error('boom'));
    expect(dialogRef.disableClose).toBe(false);
  });
});
