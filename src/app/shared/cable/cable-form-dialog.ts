import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  CABLE_TYPES,
  Cable,
  CableDraft,
  CableStatus,
  CableType,
  cableTypeDefinition,
} from '../../core/models/cable.model';
import { GeoPoint } from '../../core/models/geo.model';
import { PIN_STATUSES, PinStatus, pinStatusDefinition } from '../../core/models/pin.model';
import { CableStoreService } from '../../core/services/cable-store';

export interface CableFormDialogData {
  mode: 'create' | 'edit';
  cable?: Cable;
  /** Vértices do traçado desenhado (usados no modo criação). */
  points?: readonly GeoPoint[];
  /** Tipo pré-selecionado pela ferramenta ativa. */
  type?: CableType;
}

/** Resultado do diálogo: os dados salvos ou o pedido de editar os vértices. */
export type CableFormResult = CableDraft | 'move';

/** Valor do formulário já normalizado (sem campos opcionais). */
interface CableFormValue {
  name: string;
  type: CableType;
  status: CableStatus;
  description: string;
  color: string;
  tags: string;
}

/** Formulário de criação/edição de um cabo. Devolve um `CableDraft` ao confirmar. */
@Component({
  selector: 'app-cable-form-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    ReactiveFormsModule,
  ],
  templateUrl: './cable-form-dialog.html',
  styleUrl: './cable-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CableFormDialogComponent {
  protected readonly data = inject<CableFormDialogData>(MAT_DIALOG_DATA);
  protected readonly types = CABLE_TYPES;
  protected readonly statuses = PIN_STATUSES;

  private readonly store = inject(CableStoreService);
  private readonly dialogRef = inject(MatDialogRef<CableFormDialogComponent, CableFormResult>);
  private readonly formBuilder = inject(FormBuilder);
  private readonly lastSuggestion = signal('');

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    type: [(this.data.type ?? this.data.cable?.type ?? 'backbone') as CableType, [Validators.required]],
    status: ['planejado' as CableStatus, [Validators.required]],
    description: ['', [Validators.maxLength(400)]],
    color: [''],
    tags: [''],
  });

  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  private readonly value = computed<CableFormValue>(() => {
    const current = this.formValue();
    return {
      name: current.name ?? '',
      type: current.type ?? 'backbone',
      status: current.status ?? 'planejado',
      description: current.description ?? '',
      color: current.color ?? '',
      tags: current.tags ?? '',
    };
  });

  protected readonly isEdit = this.data.mode === 'edit';
  protected readonly title = this.isEdit ? 'Editar cabo' : 'Novo cabo';
  protected readonly submitLabel = this.isEdit ? 'Salvar alterações' : 'Criar cabo';

  /** Vértices que compõem o traçado (do cabo em edição ou do desenho atual). */
  protected readonly points = this.data.cable?.points ?? this.data.points ?? [];
  protected readonly nodeCount = this.points.length;

  protected readonly selectedType = computed(() => cableTypeDefinition(this.value().type));
  protected readonly previewColor = computed(() => this.value().color || this.selectedType().color);
  protected readonly selectedStatus = computed(() => pinStatusDefinition(this.value().status));

  constructor() {
    if (this.isEdit && this.data.cable) {
      const cable = this.data.cable;
      this.form.patchValue({
        name: cable.name,
        type: cable.type,
        status: cable.status,
        description: cable.description,
        color: cable.color ?? '',
        tags: cable.tags.join(', '),
      });
      this.lastSuggestion.set(cable.name);
      return;
    }

    const type = this.form.controls.type.value;
    const suggestedName = this.store.suggestName(type);
    this.lastSuggestion.set(suggestedName);
    this.form.patchValue({ name: suggestedName });
  }

  /** Ao trocar o tipo, sugere um novo nome enquanto o usuário não personalizar. */
  protected onTypeChange(type: CableType): void {
    if (this.isEdit) {
      return;
    }
    const suggestion = this.store.suggestName(type);
    const currentName = this.form.controls.name.value;
    if (!currentName || currentName === this.lastSuggestion()) {
      this.form.controls.name.setValue(suggestion);
    }
    this.lastSuggestion.set(suggestion);
  }

  protected onColorInput(event: Event): void {
    this.form.controls.color.setValue((event.target as HTMLInputElement).value);
  }

  protected resetColor(): void {
    this.form.controls.color.setValue('');
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  /** Fecha o diálogo e ativa a edição dos vértices no mapa. */
  protected moveOnMap(): void {
    this.dialogRef.close('move');
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const draft: CableDraft = {
      name: value.name.trim(),
      type: value.type,
      status: value.status,
      points: [...this.points],
      description: value.description.trim(),
      color: value.color.trim() || undefined,
      tags: value.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
    };
    this.dialogRef.close(draft);
  }

  protected statusLabel(status: CableStatus): string {
    return pinStatusDefinition(status).label;
  }
}
