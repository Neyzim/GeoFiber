import { CustomerResponse, ServicePortResponse } from '../api/api-types';
import {
  CUSTOMER_STATUS_HELP,
  customerRequest,
  describeCustomerService,
  describeHistoryEntry,
  nearestBoxes,
  portChoices,
} from './customer-rules';

const customer: CustomerResponse = {
  id: 'k1',
  name: 'Maria',
  contractCode: 'C-1',
  address: 'Rua A, 10',
  location: { longitude: -35.2, latitude: -5.8 },
  status: 'ACTIVE',
  servicePortId: 'sv1',
  boxId: 'b1',
};

describe('CUSTOMER_STATUS_HELP', () => {
  it('explains every status in plain words', () => {
    expect(Object.keys(CUSTOMER_STATUS_HELP).sort()).toEqual(['ACTIVE', 'BLOCKED', 'CANCELLED']);
    expect(CUSTOMER_STATUS_HELP.CANCELLED).toContain('porta é liberada');
  });
});

describe('customerRequest', () => {
  it('keeps every field when only the status changes', () => {
    expect(customerRequest(customer, { status: 'BLOCKED' })).toEqual({
      name: 'Maria',
      contractCode: 'C-1',
      address: 'Rua A, 10',
      location: { longitude: -35.2, latitude: -5.8 },
      status: 'BLOCKED',
      servicePortId: 'sv1',
    });
  });

  it('never sends a port for a cancelled customer', () => {
    expect(customerRequest(customer, { status: 'CANCELLED' })).not.toHaveProperty('servicePortId');
  });
});

describe('portChoices', () => {
  const ports: ServicePortResponse[] = [
    { id: 'p2', portNumber: 2, status: 'FREE' },
    { id: 'p1', portNumber: 1, status: 'FREE', splitterPortId: 's1', label: 'Frente' },
    { id: 'p3', portNumber: 3, status: 'OCCUPIED', splitterPortId: 's2', customerId: 'x' },
    { id: 'p4', portNumber: 4, status: 'FAULTY', fiberId: 'f1' },
    { id: 'sv1', portNumber: 5, status: 'OCCUPIED', splitterPortId: 's3', customerId: 'k1' },
  ];

  it('marks only free ports with signal as available, keeping the current one', () => {
    expect(portChoices(ports, 'sv1')).toEqual([
      { id: 'p1', label: 'Porta 1 · Frente', available: true },
      { id: 'p2', label: 'Porta 2', available: false, reason: 'sem sinal: nada ligado' },
      { id: 'p3', label: 'Porta 3', available: false, reason: 'em uso' },
      { id: 'p4', label: 'Porta 4', available: false, reason: 'com defeito' },
      { id: 'sv1', label: 'Porta 5', available: true, reason: 'porta atual' },
    ]);
  });
});

describe('nearestBoxes', () => {
  it('lists CTOs only, nearest first, with the distance', () => {
    const boxes = [
      { id: 'far', name: 'CTO-LONGE', type: 'CTO' as const, location: { longitude: -35.21, latitude: -5.8 } },
      { id: 'near', name: 'CTO-PERTO', type: 'CTO' as const, location: { longitude: -35.2005, latitude: -5.8 } },
      { id: 'ceo', name: 'CEO-01', type: 'CEO' as const, location: { longitude: -35.2, latitude: -5.8 } },
      { id: 'nowhere', name: 'CTO-SEM-POSICAO', type: 'CTO' as const },
    ];
    const result = nearestBoxes(boxes, { lat: -5.8, lng: -35.2 });
    expect(result.map((item) => item.id)).toEqual(['near', 'far', 'nowhere']);
    expect(result[0].label).toBe('CTO-PERTO (a 55 m)');
    expect(result[1].label).toBe('CTO-LONGE (a 1,1 km)');
    expect(result[2].label).toBe('CTO-SEM-POSICAO');
  });
});

describe('describeCustomerService', () => {
  it('says who serves the customer', () => {
    expect(describeCustomerService(customer, 'CTO-01', 5)).toBe('Atendido pela CTO-01, porta 5.');
    expect(describeCustomerService({ ...customer, servicePortId: undefined }, undefined, undefined)).toBe(
      'Ainda sem porta de atendimento.',
    );
    expect(describeCustomerService({ ...customer, status: 'CANCELLED', servicePortId: undefined })).toBe(
      'Contrato cancelado; a porta foi liberada.',
    );
  });
});

describe('describeHistoryEntry', () => {
  it('describes each change', () => {
    expect(describeHistoryEntry({ status: 'ACTIVE', servicePortId: 'p1' }).text).toBe(
      'Ativo, com porta de atendimento',
    );
    expect(describeHistoryEntry({ status: 'CANCELLED' }).text).toBe('Cancelado, sem porta');
  });
});
