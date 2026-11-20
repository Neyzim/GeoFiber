import {
  FiberEndResponse,
  FiberLinkType,
  FiberStatus,
  LooseTubeRequest,
  OpticalColor,
  PortStatus,
} from '../api/api-types';

export interface OpticalColorDefinition {
  color: OpticalColor;
  label: string;
  hex: string;
}

/** As 12 cores ABNT/TIA de tubos e fibras, na ordem da norma. */
export const OPTICAL_COLORS: readonly OpticalColorDefinition[] = [
  { color: 'GREEN', label: 'Verde', hex: '#2e9e44' },
  { color: 'YELLOW', label: 'Amarelo', hex: '#fdd835' },
  { color: 'WHITE', label: 'Branco', hex: '#ffffff' },
  { color: 'BLUE', label: 'Azul', hex: '#1e88e5' },
  { color: 'RED', label: 'Vermelho', hex: '#e53935' },
  { color: 'VIOLET', label: 'Violeta', hex: '#8e24aa' },
  { color: 'BROWN', label: 'Marrom', hex: '#795548' },
  { color: 'PINK', label: 'Rosa', hex: '#f48fb1' },
  { color: 'BLACK', label: 'Preto', hex: '#212121' },
  { color: 'GRAY', label: 'Cinza', hex: '#9e9e9e' },
  { color: 'ORANGE', label: 'Laranja', hex: '#fb8c00' },
  { color: 'TURQUOISE', label: 'Turquesa', hex: '#00bcd4' },
];

export function opticalColor(color: OpticalColor | undefined): OpticalColorDefinition {
  return OPTICAL_COLORS.find((item) => item.color === color) ?? OPTICAL_COLORS[0];
}

export interface SimpleStatusDefinition<S extends string> {
  status: S;
  label: string;
  color: string;
  /** Explicação curta para quem não é técnico. */
  hint: string;
}

export const FIBER_STATUSES: readonly SimpleStatusDefinition<FiberStatus>[] = [
  { status: 'AVAILABLE', label: 'Disponível', color: '#2e7d32', hint: 'Livre para ser ligada.' },
  { status: 'OCCUPIED', label: 'Ocupada', color: '#1e88e5', hint: 'Já está ligada em algum ponto.' },
  { status: 'BROKEN', label: 'Rompida', color: '#e53935', hint: 'Danificada; não pode ser ligada.' },
  { status: 'RESERVED', label: 'Reservada', color: '#fb8c00', hint: 'Guardada para uso futuro.' },
];

export const PORT_STATUSES: readonly SimpleStatusDefinition<PortStatus>[] = [
  { status: 'FREE', label: 'Livre', color: '#2e7d32', hint: 'Nada ligado.' },
  { status: 'OCCUPIED', label: 'Ocupada', color: '#1e88e5', hint: 'Em uso.' },
  { status: 'RESERVED', label: 'Reservada', color: '#fb8c00', hint: 'Guardada para uso futuro.' },
  { status: 'FAULTY', label: 'Com defeito', color: '#e53935', hint: 'Precisa de reparo.' },
];

export function fiberStatusDefinition(status: FiberStatus | undefined) {
  return FIBER_STATUSES.find((item) => item.status === status) ?? FIBER_STATUSES[0];
}

export function portStatusDefinition(status: PortStatus | undefined) {
  return PORT_STATUSES.find((item) => item.status === status) ?? PORT_STATUSES[0];
}

export const FIBER_LINK_LABELS: Readonly<Record<FiberLinkType, string>> = {
  OLT_PORT: 'porta PON',
  SPLITTER_PORT: 'splitter',
  SERVICE_PORT: 'porta de atendimento',
  FUSION: 'fusão',
  CONNECTOR: 'conector',
};

/** Opções de "fibras por tubo" ao criar a estrutura do cabo. */
export const FIBERS_PER_TUBE_OPTIONS: readonly number[] = [1, 2, 4, 6, 8, 12, 24];

/**
 * Tubos para preencher exatamente a capacidade do cabo: `ceil(capacidade / porTubo)` tubos,
 * o último com o resto, cores ABNT em sequência (repetem depois do 12º).
 */
export function planStructure(capacity: number, perTube: number): LooseTubeRequest[] {
  if (!Number.isInteger(capacity) || !Number.isInteger(perTube) || capacity < 1 || perTube < 1) {
    return [];
  }
  const tubes: LooseTubeRequest[] = [];
  let remaining = capacity;
  for (let number = 1; remaining > 0; number += 1) {
    const size = Math.min(perTube, remaining);
    tubes.push({
      tubeNumber: number,
      capacity: size,
      color: OPTICAL_COLORS[(number - 1) % OPTICAL_COLORS.length].color,
    });
    remaining -= size;
  }
  return tubes;
}

/** Fibras por tubo sugeridas: 12, ou a capacidade inteira quando o cabo é menor. */
export function defaultFibersPerTube(capacity: number): number {
  return Math.max(1, Math.min(12, capacity));
}

/** "Ponta A: fusão em CEO-01", "Ponta B: livre". */
export function fiberLinkText(
  end: FiberEndResponse,
  nameOf: (elementId: string) => string | undefined,
): string {
  const label = `Ponta ${end.end ?? '?'}`;
  const link = end.link;
  if (!link?.type) {
    if (end.status === 'BROKEN') return `${label}: rompida`;
    if (end.status === 'RESERVED') return `${label}: reservada`;
    return `${label}: livre`;
  }
  const where = link.elementId ? nameOf(link.elementId) : undefined;
  const what = FIBER_LINK_LABELS[link.type];
  return where ? `${label}: ${what} em ${where}` : `${label}: ${what}`;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Prévia da estrutura: "2 tubos de 12 fibras = 24 fibras". */
export function structurePreview(capacity: number, perTube: number): string {
  const tubes = planStructure(capacity, perTube);
  if (tubes.length === 0) {
    return '';
  }
  const total = tubes.reduce((sum, tube) => sum + tube.capacity, 0);
  const sizes = tubes.map((tube) => tube.capacity);
  const uniform = sizes.every((size) => size === sizes[0]);
  const tubeText = plural(tubes.length, 'tubo', 'tubos');
  const detail = uniform
    ? `${tubeText} de ${plural(sizes[0], 'fibra', 'fibras')}`
    : `${tubeText} (${sizes.slice(0, -1).join(', ')} e ${sizes[sizes.length - 1]} fibras)`;
  return `${detail} = ${plural(total, 'fibra', 'fibras')}`;
}
