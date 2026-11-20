import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TermHintComponent } from '../../../shared/help/term-hint';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { of } from 'rxjs';
import { CustomerResponse, CustomerStatus } from '../../../core/api/api-types';
import { CustomerApi } from '../../../core/api/resources/customer-api';
import { ServicePortApi } from '../../../core/api/resources/service-port-api';
import {
  CUSTOMER_STATUS_HELP,
  customerRequest,
  describeCustomerService,
  describeHistoryEntry,
} from '../../../core/network/customer-rules';
import { MapElement } from '../../../core/network/map-element';
import {
  CUSTOMER_STATUSES,
  groupDefinition,
  statusDefinition,
} from '../../../core/network/network-catalog';
import { NetworkMapRepository } from '../../../core/network/network-map-repository';
import { NotificationService } from '../../../core/services/notification';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/ui/confirm-dialog';

/** Ficha do cliente selecionado: situação explicada, quem o atende, histórico e ações. */
@Component({
  selector: 'app-customer-sheet',
  imports: [
    TermHintComponent,MatButtonModule, MatIconModule, MatProgressBarModule, MatTooltipModule],
  templateUrl: './customer-sheet.html',
  styleUrls: ['../cable-sheet/cable-sheet.scss', '../box-sheet/box-sheet.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerSheetComponent {
  private readonly repository = inject(NetworkMapRepository);
  private readonly customerApi = inject(CustomerApi);
  private readonly servicePortApi = inject(ServicePortApi);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);

  readonly element = input.required<MapElement>();
  readonly canEdit = input(true);

  readonly closed = output<void>();
  readonly editData = output<void>();
  /** Reativar um cliente cancelado: a página abre o formulário para escolher a porta. */
  readonly reactivate = output<void>();
  readonly openBox = output<string>();

  protected readonly group = groupDefinition('customer');
  protected readonly statusOptions = CUSTOMER_STATUSES;

  protected readonly customer = computed<CustomerResponse | undefined>(() =>
    this.repository.customers().find((item) => item.id === this.element().id),
  );
  protected readonly status = computed(() => statusDefinition(this.customer()?.status ?? 'ACTIVE'));
  protected readonly statusHelp = computed(
    () => CUSTOMER_STATUS_HELP[this.customer()?.status ?? 'ACTIVE'],
  );
  protected readonly boxName = computed(() => {
    const boxId = this.customer()?.boxId;
    return boxId ? this.repository.findBox(boxId)?.name : undefined;
  });

  /** Portas da CTO do cliente (para mostrar o número da porta). */
  /**
   * Chave da situação atual: muda quando a situação ou a porta mudam (inclusive por um salvamento
   * no formulário), e então histórico e portas recarregam sozinhos.
   */
  private readonly revision = computed(() => {
    const customer = this.customer();
    return customer
      ? `${customer.id}|${customer.status}|${customer.servicePortId ?? ''}|${customer.boxId ?? ''}`
      : '';
  });

  private readonly ports = rxResource({
    params: () => (this.revision() ? this.customer()?.boxId : undefined),
    stream: ({ params }) => (params ? this.servicePortApi.list(params) : of([])),
  });

  protected readonly service = computed(() => {
    const customer = this.customer();
    if (!customer) return '';
    const ports = this.ports.hasValue() ? this.ports.value() : [];
    const port = ports.find((item) => item.id === customer.servicePortId);
    return describeCustomerService(customer, this.boxName(), port?.portNumber);
  });

  private readonly history = rxResource({
    params: () => this.revision() || undefined,
    stream: ({ params }) => (params ? this.customerApi.history(params.split('|')[0]) : of([])),
  });

  protected readonly historyLoading = computed(() => this.history.isLoading());
  protected readonly historyEntries = computed(() => {
    const entries = this.history.hasValue() ? this.history.value() : [];
    return [...entries]
      .sort((a, b) => (b.changedAt ?? '').localeCompare(a.changedAt ?? ''))
      .map((entry) => describeHistoryEntry(entry));
  });

  changeStatus(status: CustomerStatus): void {
    const customer = this.customer();
    if (!customer?.id || customer.status === status) return;
    if (customer.status === 'CANCELLED') {
      // Volta a usar uma porta: precisa escolher qual no formulário.
      this.reactivate.emit();
      return;
    }
    if (status === 'CANCELLED') {
      this.confirm({
        title: 'Cancelar contrato',
        message: `Cancelar o contrato de "${customer.name}"? A porta de atendimento será liberada para outro cliente. O histórico continua guardado.`,
        confirmLabel: 'Cancelar contrato',
        cancelLabel: 'Voltar',
        danger: true,
      }).subscribe((confirmed) => {
        if (confirmed) this.save(customer, status);
      });
      return;
    }
    this.save(customer, status);
  }

  protected deleteCustomer(): void {
    const customer = this.customer();
    if (!customer?.id) return;
    const id = customer.id;
    this.confirm({
      title: 'Excluir cadastro',
      message: `Excluir "${customer.name}" e todo o histórico? Use só para cadastro feito por engano. Para encerrar o contrato, use "Cancelar".`,
      confirmLabel: 'Excluir',
      danger: true,
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.repository.deleteCustomer(id).subscribe({
        next: () => this.notifications.success('Cadastro excluído.'),
        error: (error: unknown) => this.notifications.apiError(error),
      });
    });
  }

  private save(customer: CustomerResponse, status: CustomerStatus): void {
    this.repository.updateCustomer(customer.id ?? '', customerRequest(customer, { status })).subscribe({
      next: () => this.notifications.success(`Situação: ${statusDefinition(status).label}.`),
      error: (error: unknown) => this.notifications.apiError(error),
    });
  }

  private confirm(data: ConfirmDialogData) {
    return this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
        data,
        width: '440px',
        maxWidth: '92vw',
      })
      .afterClosed();
  }
}
