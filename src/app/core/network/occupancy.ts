import type {
  FiberStatus,
  OltPortResponse,
  ServicePortResponse,
  SplitterResponse,
} from '../api/api-types';

/** Quantas posições estão em uso de quantas existem (ex.: 3/12). */
export interface Occupancy {
  occupied: number;
  capacity: number;
}

/** Portas de atendimento: ocupada = tem cliente. */
export function servicePortOccupancy(
  ports: readonly Pick<ServicePortResponse, 'customerId'>[],
): Occupancy {
  return {
    occupied: ports.filter((port) => !!port.customerId).length,
    capacity: ports.length,
  };
}

/** Splitter: só as saídas contam; ocupada = liga a uma porta de atendimento ou a uma fibra. */
export function splitterOccupancy(splitter: Pick<SplitterResponse, 'ports'>): Occupancy {
  const outputs = (splitter.ports ?? []).filter((port) => port.direction === 'OUTPUT');
  return {
    occupied: outputs.filter((port) => !!port.servicePortId || !!port.fiberId).length,
    capacity: outputs.length,
  };
}

/** Portas PON da OLT: ocupada = tem fibra ou está marcada como ocupada. */
export function oltPortOccupancy(
  ports: readonly Pick<OltPortResponse, 'status' | 'fiberId'>[],
): Occupancy {
  return {
    occupied: ports.filter((port) => !!port.fiberId || port.status === 'OCCUPIED').length,
    capacity: ports.length,
  };
}

/** Fibras de um tubo: ocupada = situação "ocupada". */
export function tubeOccupancy(fibers: readonly { status?: FiberStatus }[]): Occupancy {
  return {
    occupied: fibers.filter((fiber) => fiber.status === 'OCCUPIED').length,
    capacity: fibers.length,
  };
}
