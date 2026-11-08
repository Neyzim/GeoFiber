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
import { GeoPoint } from '../../core/models/geo.model';
import { NetworkModel, networkModelSummary } from '../../core/models/network-model.model';
import {
  PIN_STATUSES,
  PIN_TYPES,
  Pin,
  PinDraft,
  PinStatus,
  PinType,
  pinStatusDefinition,
  pinTypeDefinition,
} from '../../core/models/pin.model';
import { NetworkModelStoreService } from '../../core/services/network-model-store';
import { PinStoreService } from '../../core/services/pin-store';
import { CoordinatePipe } from '../pipes/coordinate-pipe';

export interface PinFormDialogData {
  mode: 'create' | 'edit';
  pin?: Pin;
  /** Posição sugerida (clique no mapa ou centro atual). */
  position?: GeoPoint;
  /** Tipo pré-selecionado na criação (vem da ferramenta ativa no mapa). */
  type?: PinType;
  /** Modelo pré-selecionado na criação (vem da ferramenta ativa no mapa). */
  modelId?: string;
}

/** Resultado do diálogo: os dados salvos ou o pedido de mover o PIN no mapa. */
export type PinFormResult = PinDraft | 'move';

/** Valor do formulário já normalizado (sem campos opcionais). */
interface PinFormValue {
  name: string;
  type: PinType;
  status: PinStatus;
  modelId: string;
  description: string;
  latitude: number;
  longitude: number;
  color: string;
  tags: string;
}

/** Formulário de criação/edição de um PIN. Devolve um `PinDraft` ao confirmar. */
@Component({
  selector: 'app-pin-form-dialog',
  imports: [
    CoordinatePipe,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    ReactiveFormsModule,
  ],
  templateUrl: './pin-form-dialog.html',
  styleUrl: './pin-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PinFormDialogComponent {
  protected readonly data = inject<PinFormDialogData>(MAT_DIALOG_DATA);
  protected readonly types = PIN_TYPES;
  protected readonly statuses = PIN_STATUSES;

  private readonly store = inject(PinStoreService);
  private readonly models = inject(NetworkModelStoreService);
  private readonly dialogRef = inject(MatDialogRef<PinFormDialogComponent, PinFormResult>);
  private readonly formBuilder = inject(FormBuilder);
  private readonly lastSuggestion = signal('');

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    type: ['cto' as PinType, [Validators.required]],
    status: ['planejado' as PinStatus, [Validators.required]],
    modelId: [''],
    description: ['', [Validators.maxLength(400)]],
    latitude: [0, [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitude: [0, [Validators.required, Validators.min(-180), Validators.max(180)]],
    color: [''],
    tags: [''],
  });

  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  /** Valor reativo do formulário com todos os campos já resolvidos. */
  private readonly value = computed<PinFormValue>(() => {
    const current = this.formValue();
    return {
      name: current.name ?? '',
      type: current.type ?? 'cto',
      status: current.status ?? 'planejado',
      modelId: current.modelId ?? '',
      description: current.description ?? '',
      latitude: current.latitude ?? 0,
      longitude: current.longitude ?? 0,
      color: current.color ?? '',
      tags: current.tags ?? '',
    };
  });

  protected readonly isEdit = this.data.mode === 'edit';
  protected readonly title = this.isEdit ? 'Editar PIN' : 'Novo PIN';
  protected readonly submitLabel = this.isEdit ? 'Salvar alterações' : 'Criar PIN';

  protected readonly selectedType = computed(() => pinTypeDefinition(this.value().type));
  /** Modelos cadastrados que geram o tipo de PIN selecionado (CTO/CEO). */
  protected readonly modelOptions = computed<readonly NetworkModel[]>(() =>
    this.models.modelsForPinType(this.value().type),
  );
  protected readonly selectedModel = computed<NetworkModel | null>(() =>
    this.models.findById(this.value().modelId || null),
  );
  /** O seletor de modelo só aparece para os tipos que possuem cadastro. */
  protected readonly showModel = computed(() => this.modelOptions().length > 0);
  protected readonly previewColor = computed(
    () => this.value().color || this.selectedModel()?.color || this.selectedType().color,
  );
  protected readonly modelSummary = computed(() => {
    const model = this.selectedModel();
    return model ? networkModelSummary(model) : '';
  });
  protected readonly previewPosition = computed<GeoPoint | null>(() => {
    const { latitude, longitude } = this.value();
    return Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { lat: latitude, lng: longitude }
      : null;
  });

  constructor() {
    if (this.isEdit && this.data.pin) {
      const pin = this.data.pin;
      this.form.patchValue({
        name: pin.name,
        type: pin.type,
        status: pin.status,
        modelId: pin.modelId ?? '',
        description: pin.description,
        latitude: pin.position.lat,
        longitude: pin.position.lng,
        color: pin.color ?? '',
        tags: pin.tags.join(', '),
      });
      this.lastSuggestion.set(pin.name);
      return;
    }

    const type: PinType = this.data.type ?? 'cto';
    const suggestedName = this.store.suggestName(type);
    this.lastSuggestion.set(suggestedName);
    this.form.patchValue({
      name: suggestedName,
      type,
      modelId: this.data.modelId ?? this.models.modelsForPinType(type)[0]?.id ?? '',
      latitude: this.data.position?.lat ?? 0,
      longitude: this.data.position?.lng ?? 0,
    });
  }

  /** Ao trocar o tipo, ajusta o modelo e sugere um novo nome (na criação). */
  protected onTypeChange(type: PinType): void {
    this.form.controls.modelId.setValue(this.models.modelsForPinType(type)[0]?.id ?? '');
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

  /** Fecha o diálogo e ativa o arrasto do PIN no mapa. */
  protected moveOnMap(): void {
    this.dialogRef.close('move');
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const draft: PinDraft = {
      name: value.name.trim(),
      type: value.type,
      status: value.status,
      modelId: value.modelId.trim() || undefined,
      description: value.description.trim(),
      position: { lat: value.latitude, lng: value.longitude },
      color: value.color.trim() || undefined,
      tags: value.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
    };
    this.dialogRef.close(draft);
  }

  protected statusLabel(status: PinStatus): string {
    return pinStatusDefinition(status).label;
  }
}
