import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { BoxRequest, BoxResponse, BoxType, InfrastructureStatus } from '../../core/api/api-types';
import { GeoPoint } from '../../core/models/geo.model';
import { NetworkModel, networkModelSummary } from '../../core/models/network-model.model';
import { NetworkMapRepository } from '../../core/network/network-map-repository';
import { ELEMENT_GROUPS, INFRA_STATUSES, groupDefinition } from '../../core/network/network-catalog';
import { NetworkModelStoreService } from '../../core/services/network-model-store';
import { NotificationService } from '../../core/services/notification';
import { optionalText, showSaveError } from './form-support';

export type BoxFormData =
  | { mode: 'create'; position: GeoPoint; type: BoxType }
  | { mode: 'edit'; box: BoxResponse };

const BOX_TYPES: readonly BoxType[] = ['CTO', 'CEO', 'DIO'];

/** Cadastro/edição de uma caixa (CTO, CEO ou DIO). Salva na API e fecha com a caixa salva. */
@Component({
  selector: 'app-box-form-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './box-form-dialog.html',
  styleUrl: './network-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoxFormDialogComponent {
  protected readonly data = inject<BoxFormData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<BoxFormDialogComponent, BoxResponse>);
  private readonly repository = inject(NetworkMapRepository);
  private readonly notifications = inject(NotificationService);
  private readonly models = inject(NetworkModelStoreService);

  protected readonly statuses = INFRA_STATUSES;
  protected readonly types = ELEMENT_GROUPS.filter((group) =>
    BOX_TYPES.includes(group.group as BoxType),
  );
  protected readonly isEdit = this.data.mode === 'edit';
  protected readonly saving = signal(false);
  protected readonly extraErrors = signal<readonly string[]>([]);

  private readonly initial: BoxResponse | null = this.data.mode === 'edit' ? this.data.box : null;
  private readonly position: GeoPoint =
    this.data.mode === 'create'
      ? this.data.position
      : {
          lat: this.initial?.location?.latitude ?? 0,
          lng: this.initial?.location?.longitude ?? 0,
        };

  readonly form = inject(FormBuilder).group({
    name: [this.initial?.name ?? '', [Validators.required, Validators.maxLength(120)]],
    type: [
      (this.data.mode === 'create' ? this.data.type : (this.initial?.type ?? 'CTO')) as BoxType,
      [Validators.required],
    ],
    usageStatus: [(this.initial?.usageStatus ?? 'PLANNED') as InfrastructureStatus],
    modelId: [''],
    manufacturer: [this.initial?.manufacturer ?? ''],
    model: [this.initial?.model ?? ''],
    address: [this.initial?.address ?? ''],
    description: [this.initial?.description ?? ''],
    powerCapacity: [this.initial?.powerCapacity ?? (null as number | null), [Validators.min(1)]],
    trayCapacity: [this.initial?.trayCapacity ?? (null as number | null), [Validators.min(1)]],
    latitude: [this.position.lat, [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitude: [this.position.lng, [Validators.required, Validators.min(-180), Validators.max(180)]],
  });

  private readonly type = toSignal(this.form.controls.type.valueChanges, {
    initialValue: this.form.controls.type.value,
  });

  protected readonly group = computed(() => groupDefinition(this.type() ?? 'CTO'));
  protected readonly isCto = computed(() => this.type() === 'CTO');
  /** Atalhos disponíveis para o tipo escolhido (DIO não tem). */
  protected readonly shortcuts = computed<readonly NetworkModel[]>(() => {
    const type = this.type();
    if (type === 'CTO') return this.models.byKind('cto')();
    if (type === 'CEO') return this.models.byKind('ceo')();
    return [];
  });

  protected summary(model: NetworkModel): string {
    return networkModelSummary(model);
  }

  /** Atalho escolhido: preenche fabricante, modelo e capacidades. */
  protected applyShortcut(id: string): void {
    const model = this.models.findById(id);
    if (!model) {
      return;
    }
    this.form.patchValue({
      manufacturer: model.manufacturer ?? this.form.controls.manufacturer.value,
      model: model.model ?? this.form.controls.model.value,
      powerCapacity: model.powerCapacity ?? this.form.controls.powerCapacity.value,
      trayCapacity: model.trayCapacity ?? this.form.controls.trayCapacity.value,
    });
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const type = value.type ?? 'CTO';
    const body: BoxRequest = {
      name: (value.name ?? '').trim(),
      type,
      usageStatus: value.usageStatus ?? 'PLANNED',
      manufacturer: optionalText(value.manufacturer),
      model: optionalText(value.model),
      address: optionalText(value.address),
      description: optionalText(value.description),
      location: { longitude: value.longitude ?? 0, latitude: value.latitude ?? 0 },
    };
    // Portas de atendimento só existem em CTO; o backend recusa em CEO/DIO.
    if (type === 'CTO' && value.powerCapacity) {
      body.powerCapacity = value.powerCapacity;
    }
    if (value.trayCapacity) {
      body.trayCapacity = value.trayCapacity;
    }

    const request =
      this.initial?.id !== undefined
        ? this.repository.updateBox(this.initial.id, body)
        : this.repository.createBox(body);

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
