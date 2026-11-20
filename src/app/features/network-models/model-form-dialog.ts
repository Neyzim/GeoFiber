import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CableRole } from '../../core/api/api-types';
import {
  FIBER_OPTIONS,
  NETWORK_MODEL_KINDS,
  NetworkModel,
  NetworkModelDraft,
  NetworkModelKind,
  networkModelSummary,
} from '../../core/models/network-model.model';
import { CABLE_ROLES } from '../../core/network/network-catalog';

export interface ModelFormDialogData {
  /** Modelo em edição; ausente no cadastro de um novo modelo. */
  model?: NetworkModel;
  /** Categoria pré-selecionada ao criar. */
  kind?: NetworkModelKind;
}

/** Cadastro/edição de um atalho de CTO, CEO ou cabo. */
@Component({
  selector: 'app-model-form-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './model-form-dialog.html',
  styleUrl: './model-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelFormDialogComponent {
  protected readonly data = inject<ModelFormDialogData>(MAT_DIALOG_DATA);
  protected readonly kinds = NETWORK_MODEL_KINDS;
  protected readonly roles = CABLE_ROLES;
  protected readonly fiberOptions = FIBER_OPTIONS;

  private readonly dialogRef = inject(MatDialogRef<ModelFormDialogComponent, NetworkModelDraft>);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group({
    kind: [(this.data.model?.kind ?? this.data.kind ?? 'cto') as NetworkModelKind, [Validators.required]],
    name: [this.data.model?.name ?? '', [Validators.required, Validators.maxLength(60)]],
    description: [this.data.model?.description ?? '', [Validators.maxLength(200)]],
    manufacturer: [this.data.model?.manufacturer ?? '', [Validators.maxLength(60)]],
    model: [this.data.model?.model ?? '', [Validators.maxLength(60)]],
    powerCapacity: [this.data.model?.powerCapacity ?? 8, [Validators.min(1), Validators.max(256)]],
    trayCapacity: [this.data.model?.trayCapacity ?? 2, [Validators.min(1), Validators.max(64)]],
    role: [(this.data.model?.role ?? 'DISTRIBUTION') as CableRole],
    fiberCapacity: [this.data.model?.fiberCapacity ?? 12, [Validators.min(1)]],
  });

  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  protected readonly title = this.data.model ? 'Editar modelo' : 'Novo modelo';
  protected readonly submitLabel = this.data.model ? 'Salvar alterações' : 'Cadastrar modelo';

  protected readonly selectedKind = computed(() => this.formValue().kind ?? 'cto');
  protected readonly summaryText = computed(() => networkModelSummary(this.buildDraft() as NetworkModel));

  protected cancel(): void {
    this.dialogRef.close();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.buildDraft());
  }

  /** Só guarda os campos que fazem sentido para a categoria escolhida. */
  private buildDraft(): NetworkModelDraft {
    this.formValue();
    const current = this.form.getRawValue();
    const draft: NetworkModelDraft = {
      kind: current.kind,
      name: current.name.trim(),
      description: current.description.trim(),
    };
    if (current.manufacturer.trim()) draft.manufacturer = current.manufacturer.trim();
    if (current.model.trim()) draft.model = current.model.trim();
    if (current.kind === 'cto') draft.powerCapacity = current.powerCapacity;
    if (current.kind === 'ceo') draft.trayCapacity = current.trayCapacity;
    if (current.kind === 'cabo') {
      draft.role = current.role;
      draft.fiberCapacity = current.fiberCapacity;
    }
    return draft;
  }
}
