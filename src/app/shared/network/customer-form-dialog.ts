import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { catchError, of, startWith, switchMap } from 'rxjs';
import {
  CustomerRequest,
  CustomerResponse,
  CustomerStatus,
  ServicePortResponse,
} from '../../core/api/api-types';
import { ServicePortApi } from '../../core/api/resources/service-port-api';
import { GeoPoint } from '../../core/models/geo.model';
import {
  CUSTOMER_STATUS_HELP,
  PortChoice,
  customerRequest,
  nearestBoxes,
  portChoices,
} from '../../core/network/customer-rules';
import { CUSTOMER_STATUSES, groupDefinition } from '../../core/network/network-catalog';
import { NetworkMapRepository } from '../../core/network/network-map-repository';
import { NotificationService } from '../../core/services/notification';
import { optionalText, showSaveError } from './form-support';

export type CustomerFormData =
  | { mode: 'create'; position: GeoPoint }
  /** `status`: situação já escolhida ao abrir (ex.: reativar um cliente cancelado). */
  | { mode: 'edit'; customer: CustomerResponse; status?: CustomerStatus };

/**
 * Cadastro/edição do cliente: dados do contrato, situação (com explicação) e a porta de
 * atendimento — primeiro a CTO (mais próximas primeiro), depois uma porta livre com sinal.
 */
@Component({
  selector: 'app-customer-form-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './customer-form-dialog.html',
  styleUrl: './network-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerFormDialogComponent {
  protected readonly data = inject<CustomerFormData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<CustomerFormDialogComponent, CustomerResponse>);
  private readonly repository = inject(NetworkMapRepository);
  private readonly servicePortApi = inject(ServicePortApi);
  private readonly notifications = inject(NotificationService);

  protected readonly group = groupDefinition('customer');
  protected readonly statuses = CUSTOMER_STATUSES;
  protected readonly help = CUSTOMER_STATUS_HELP;
  protected readonly isEdit = this.data.mode === 'edit';
  protected readonly saving = signal(false);
  protected readonly extraErrors = signal<readonly string[]>([]);
  protected readonly loadingPorts = signal(false);

  private readonly initial: CustomerResponse | null =
    this.data.mode === 'edit' ? this.data.customer : null;
  private readonly position: GeoPoint =
    this.data.mode === 'create'
      ? this.data.position
      : {
          lat: this.initial?.location?.latitude ?? 0,
          lng: this.initial?.location?.longitude ?? 0,
        };

  readonly form = inject(FormBuilder).group({
    name: [this.initial?.name ?? '', [Validators.required, Validators.maxLength(120)]],
    contractCode: [this.initial?.contractCode ?? '', [Validators.required, Validators.maxLength(80)]],
    address: [this.initial?.address ?? ''],
    status: [
      ((this.data.mode === 'edit' ? this.data.status : undefined) ??
        this.initial?.status ??
        'ACTIVE') as CustomerStatus,
    ],
    boxId: [this.initial?.boxId ?? ''],
    servicePortId: [this.initial?.servicePortId ?? ''],
  });

  private readonly status = toSignal(this.form.controls.status.valueChanges, {
    initialValue: this.form.controls.status.value,
  });
  protected readonly isCancelled = computed(() => this.status() === 'CANCELLED');
  protected readonly statusHelp = computed(() => this.help[this.status() ?? 'ACTIVE']);

  /** CTOs mais próximas do cliente primeiro. */
  protected readonly boxes = computed(() => nearestBoxes(this.repository.boxes(), this.position));

  private readonly rawPorts = signal<readonly ServicePortResponse[]>([]);
  readonly ports = computed<PortChoice[]>(() =>
    portChoices(this.rawPorts(), this.initial?.servicePortId),
  );

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.form.controls.boxId.valueChanges
      .pipe(
        startWith(this.form.controls.boxId.value),
        switchMap((boxId) => {
          if (!boxId) return of([] as ServicePortResponse[]);
          this.loadingPorts.set(true);
          return this.servicePortApi.list(boxId).pipe(
            catchError((error: unknown) => {
              this.notifications.apiError(error);
              return of([] as ServicePortResponse[]);
            }),
          );
        }),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe((ports) => {
        this.loadingPorts.set(false);
        this.rawPorts.set(ports);
        // A porta escolhida precisa ser desta CTO.
        const chosen = this.form.controls.servicePortId.value;
        if (chosen && !ports.some((port) => port.id === chosen)) {
          this.form.controls.servicePortId.setValue('');
        }
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
    const patch: CustomerRequest = {
      name: (value.name ?? '').trim(),
      contractCode: (value.contractCode ?? '').trim(),
      location: { longitude: this.position.lng, latitude: this.position.lat },
      status: value.status ?? 'ACTIVE',
    };
    const address = optionalText(value.address);
    if (address) patch.address = address;
    if (value.servicePortId) patch.servicePortId = value.servicePortId;

    // Partindo do cliente atual, mas sem herdar a porta: ela vem só do formulário.
    const base: CustomerResponse = { ...(this.initial ?? {}), servicePortId: undefined, address: undefined };
    const body = customerRequest(base, patch);
    const request = this.initial?.id
      ? this.repository.updateCustomer(this.initial.id, body)
      : this.repository.createCustomer(body);

    this.saving.set(true);
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
