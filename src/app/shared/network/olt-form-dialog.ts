import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { InfrastructureStatus, OltRequest, OltResponse } from '../../core/api/api-types';
import { GeoPoint } from '../../core/models/geo.model';
import { NetworkMapRepository } from '../../core/network/network-map-repository';
import { INFRA_STATUSES, groupDefinition } from '../../core/network/network-catalog';
import { NotificationService } from '../../core/services/notification';
import { optionalText, showSaveError } from './form-support';

export type OltFormData =
  | { mode: 'create'; position: GeoPoint }
  | { mode: 'edit'; olt: OltResponse };

/** Cadastro/edição de uma OLT. Salva na API e fecha com a OLT salva. */
@Component({
  selector: 'app-olt-form-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './olt-form-dialog.html',
  styleUrl: './network-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OltFormDialogComponent {
  protected readonly data = inject<OltFormData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<OltFormDialogComponent, OltResponse>);
  private readonly repository = inject(NetworkMapRepository);
  private readonly notifications = inject(NotificationService);

  protected readonly statuses = INFRA_STATUSES;
  protected readonly group = groupDefinition('olt');
  protected readonly isEdit = this.data.mode === 'edit';
  protected readonly saving = signal(false);
  protected readonly extraErrors = signal<readonly string[]>([]);

  private readonly initial: OltResponse | null = this.data.mode === 'edit' ? this.data.olt : null;
  private readonly position: GeoPoint =
    this.data.mode === 'create'
      ? this.data.position
      : {
          lat: this.initial?.location?.latitude ?? 0,
          lng: this.initial?.location?.longitude ?? 0,
        };

  readonly form = inject(FormBuilder).nonNullable.group({
    name: [this.initial?.name ?? '', [Validators.required, Validators.maxLength(120)]],
    usageStatus: [(this.initial?.usageStatus ?? 'PLANNED') as InfrastructureStatus],
    model: [this.initial?.model ?? ''],
    description: [this.initial?.description ?? ''],
    latitude: [this.position.lat, [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitude: [this.position.lng, [Validators.required, Validators.min(-180), Validators.max(180)]],
  });

  protected cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const body: OltRequest = {
      name: value.name.trim(),
      usageStatus: value.usageStatus,
      model: optionalText(value.model),
      description: optionalText(value.description),
      location: { longitude: value.longitude, latitude: value.latitude },
    };
    const request =
      this.initial?.id !== undefined
        ? this.repository.updateOlt(this.initial.id, body)
        : this.repository.createOlt(body);

    this.saving.set(true);
    // Enquanto salva, ESC e clique fora não fecham: senão o pedido termina sem a tela saber.
    this.dialogRef.disableClose = true;
    this.extraErrors.set([]);
    request.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.dialogRef.close(saved);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.dialogRef.disableClose = false;
        this.extraErrors.set(showSaveError(this.form, error, this.notifications));
      },
    });
  }
}
