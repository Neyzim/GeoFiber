/**
 * Catálogo de rótulos, ícones e cores da rede no mapa.
 * Os valores do domínio (tipos, funções, situações) são os do backend.
 */
import { CableRole, CustomerStatus, InfrastructureStatus } from '../api/api-types';

/** Origem de um ponto no mapa. */
export type ElementKind = 'olt' | 'box' | 'customer';

/** Grupo visual de um ponto (o tipo de caixa vira grupo próprio). */
export type ElementGroup = 'olt' | 'CTO' | 'CEO' | 'DIO' | 'customer';

export interface GroupDefinition {
  group: ElementGroup;
  label: string;
  longLabel: string;
  code: string;
  icon: string;
  color: string;
}

export const ELEMENT_GROUPS: readonly GroupDefinition[] = [
  {
    group: 'olt',
    label: 'OLT',
    longLabel: 'OLT / Central',
    code: 'OLT',
    icon: 'dns',
    color: '#1e88e5',
  },
  {
    group: 'CTO',
    label: 'CTO',
    longLabel: 'Caixa de Terminação Óptica',
    code: 'CTO',
    icon: 'hub',
    color: '#fb8c00',
  },
  {
    group: 'CEO',
    label: 'CEO',
    longLabel: 'Caixa de Emenda Óptica',
    code: 'CEO',
    icon: 'call_split',
    color: '#8e24aa',
  },
  {
    group: 'DIO',
    label: 'DIO',
    longLabel: 'Distribuidor Interno Óptico',
    code: 'DIO',
    icon: 'lan',
    color: '#00897b',
  },
  {
    group: 'customer',
    label: 'Cliente',
    longLabel: 'Cliente / Assinante',
    code: 'CLI',
    icon: 'home',
    color: '#43a047',
  },
];

export interface RoleDefinition {
  role: CableRole;
  label: string;
  code: string;
  icon: string;
  color: string;
  weight: number;
}

export const CABLE_ROLES: readonly RoleDefinition[] = [
  {
    role: 'BACKBONE',
    label: 'Backbone',
    code: 'BB',
    icon: 'linear_scale',
    color: '#3949ab',
    weight: 6,
  },
  { role: 'FEEDER', label: 'Alimentação', code: 'AL', icon: 'cable', color: '#e53935', weight: 5 },
  {
    role: 'DISTRIBUTION',
    label: 'Distribuição',
    code: 'DI',
    icon: 'alt_route',
    color: '#00897b',
    weight: 4,
  },
  { role: 'DROP', label: 'Drop', code: 'DR', icon: 'conversion_path', color: '#f9a825', weight: 3 },
  {
    role: 'INTERCONNECTION',
    label: 'Interconexão',
    code: 'IC',
    icon: 'swap_horiz',
    color: '#6d4c41',
    weight: 4,
  },
];

export interface StatusDefinition<S extends string = string> {
  status: S;
  label: string;
  color: string;
}

export const INFRA_STATUSES: readonly StatusDefinition<InfrastructureStatus>[] = [
  { status: 'PLANNED', label: 'Planejado', color: '#fbc02d' },
  { status: 'INSTALLED', label: 'Instalado', color: '#1e88e5' },
  { status: 'ACTIVE', label: 'Ativo', color: '#2e7d32' },
  { status: 'DAMAGED', label: 'Danificado', color: '#e53935' },
  { status: 'DEACTIVATED', label: 'Desativado', color: '#9e9e9e' },
];

export const CUSTOMER_STATUSES: readonly StatusDefinition<CustomerStatus>[] = [
  { status: 'ACTIVE', label: 'Ativo', color: '#2e7d32' },
  { status: 'BLOCKED', label: 'Bloqueado', color: '#fb8c00' },
  { status: 'CANCELLED', label: 'Cancelado', color: '#9e9e9e' },
];

export function groupDefinition(group: ElementGroup): GroupDefinition {
  return ELEMENT_GROUPS.find((item) => item.group === group) ?? ELEMENT_GROUPS[0];
}

export function roleDefinition(role: CableRole): RoleDefinition {
  return CABLE_ROLES.find((item) => item.role === role) ?? CABLE_ROLES[0];
}

/** Situação de infraestrutura ou de cliente (procura nas duas listas). */
export function statusDefinition(status: InfrastructureStatus | CustomerStatus): StatusDefinition {
  return (
    INFRA_STATUSES.find((item) => item.status === status) ??
    CUSTOMER_STATUSES.find((item) => item.status === status) ??
    INFRA_STATUSES[0]
  );
}

export interface LineStyle {
  color: string;
  weight: number;
  dashArray?: string;
  opacity: number;
}

/** Estilo da linha do cabo: cor/espessura pela função, tracejado e cor pela situação. */
export function cableLineStyle(role: CableRole, status: InfrastructureStatus): LineStyle {
  const definition = roleDefinition(role);
  const base: LineStyle = { color: definition.color, weight: definition.weight, opacity: 0.9 };
  switch (status) {
    case 'PLANNED':
      return { ...base, dashArray: '10 8' };
    case 'DAMAGED':
      return { ...base, color: '#e53935', dashArray: '4 6' };
    case 'DEACTIVATED':
      return { ...base, color: '#9e9e9e', opacity: 0.5 };
    default:
      return base;
  }
}
