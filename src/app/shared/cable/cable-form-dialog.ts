import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Observable, map, tap } from 'rxjs';
import {
  CableRequest,
  CableResponse,
  CableRole,
  CoordinateDto,
  InfrastructureStatus,
} from '../../core/api/api-types';
import { toCoordinates } from '../../core/api/coordinates';
import { GeoPoint } from '../../core/models/geo.model';
import {
  FIBER_OPTIONS,
  NetworkModel,
  networkModelSummary,
} from '../../core/models/network-model.model';
import {
  CableEndpoints,
  ElementRef,
  NetworkMapRepository,
} from '../../core/network/network-map-repository';
import { CABLE_ROLES, INFRA_STATUSES, roleDefinition } from '../../core/network/network-catalog';
import { NetworkModelStoreService } from '../../core/services/network-model-store';
import { NotificationService } from '../../core/services/notification';
import { optionalText, showSaveError } from '../network/form-support';

export interface CableEndSuggestion {
  ref: ElementRef;
  name: string;
}

export type CableFormData =
  | {
      mode: 'create';
      points: readonly GeoPoint[];
      role: CableRole;
      start?: CableEndSuggestion;
      end?: CableEndSuggestion;
    }
  | { mode: 'edit'; cable: CableResponse };

/**
 * Cadastro/edição de um cabo. Na criação, sugere início e fim a partir dos elementos
 * em que o traçado começou e terminou; na edição, início/fim não são tocados.
 */
@Component({
  selector: 'app-cable-form-dialog',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './cable-form-dialog.html',
  styleUrl: '../network/network-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CableFormDialogComponent {
  protected readonly data = inject<CableFormData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<CableFormDialogComponent, CableResponse>);
  private readonly repository = inject(NetworkMapRepository);
  private readonly notifications = inject(NotificationService);
  private readonly models = inject(NetworkModelStoreService);

  protected readonly roles = CABLE_ROLES;
  protected readonly statuses = INFRA_STATUSES;
  protected readonly fiberOptions = FIBER_OPTIONS;
  protected readonly shortcuts = this.models.byKind('cabo');
  protected readonly isEdit = this.data.mode === 'edit';
  protected readonly start = this.data.mode === 'create' ? this.data.start : undefined;
  protected readonly end = this.data.mode === 'create' ? this.data.end : undefined;
  protected readonly saving = signal(false);
  protected readonly extraErrors = signal<readonly string[]>([]);

  private readonly initial: CableResponse | null =
    this.data.mode === 'edit' ? this.data.cable : null;

  readonly form = inject(FormBuilder).nonNullable.group({
    name: [this.initial?.name ?? '', [Validators.required, Validators.maxLength(120)]],
    role: [
      (this.data.mode === 'create' ? this.data.role : (this.initial?.role ?? 'DISTRIBUTION')) as CableRole,
      [Validators.required],
    ],
    usageStatus: [(this.initial?.usageStatus ?? 'PLANNED') as InfrastructureStatus],
    modelId: [''],
    manufacturer: [this.initial?.manufacturer ?? ''],
    model: [this.initial?.model ?? ''],
    fiberCapacity: [this.initial?.fiberCapacity ?? 12, [Validators.required, Validators.min(1)]],
    description: [this.initial?.description ?? ''],
    useStart: [this.start !== undefined],
    useEnd: [this.end !== undefined],
  });

  private readonly role = toSignal(this.form.controls.role.valueChanges, {
    initialValue: this.form.controls.role.value,
  });
  protected readonly roleColor = computed(() => roleDefinition(this.role()).color);
  protected readonly roleCode = computed(() => roleDefinition(this.role()).code);

  protected summary(model: NetworkModel): string {
    return networkModelSummary(model);
  }

  /** Atalho escolhido: preenche função, fibras, fabricante e modelo. */
  protected applyShortcut(id: string): void {
    const model = this.models.findById(id);
    if (!model) {
      return;
    }
    const current = this.form.getRawValue();
    this.form.patchValue({
      role: model.role ?? current.role,
      fiberCapacity: model.fiberCapacity ?? current.fiberCapacity,
      manufacturer: model.manufacturer ?? current.manufacturer,
      model: model.model ?? current.model,
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
    const coordinates: CoordinateDto[] =
      this.data.mode === 'create'
        ? toCoordinates(this.data.points)
        : (this.initial?.coordinates ?? []);
    const body: CableRequest = {
      name: value.name.trim(),
      role: value.role,
      usageStatus: value.usageStatus,
      manufacturer: optionalText(value.manufacturer),
      model: optionalText(value.model),
      fiberCapacity: value.fiberCapacity,
      description: optionalText(value.description),
      coordinates,
    };

    this.saving.set(true);
    // Enquanto salva, ESC e clique fora não fecham: senão o pedido termina sem a tela saber.
    this.dialogRef.disableClose = true;
    this.extraErrors.set([]);
    this.save(body, value.useStart, value.useEnd).subscribe({
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

  private save(body: CableRequest, useStart: boolean, useEnd: boolean): Observable<CableResponse> {
    if (this.initial?.id !== undefined) {
      return this.repository.updateCable(this.initial.id, body);
    }
    const endpoints: CableEndpoints = {};
    if (useStart && this.start) endpoints.start = this.start.ref;
    if (useEnd && this.end) endpoints.end = this.end.ref;
    const onlyOne = (endpoints.start === undefined) !== (endpoints.end === undefined);

    return this.repository.createCable(body, endpoints).pipe(
      tap((result) => {
        if (result.attachmentsSaved === false) {
          this.notifications.warning('Cabo salvo, mas a lista de início/fim não foi gravada.');
        } else if (onlyOne) {
          this.notifications.info('Cabo salvo. Defina início e fim na ficha do cabo (Etapa 2).');
        }
      }),
      map((result) => result.cable),
    );
  }
}
