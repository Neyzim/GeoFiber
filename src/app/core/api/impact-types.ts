/**
 * Tipos do impacto de manutenção, gerados do OpenAPI do backend (`npm run api:types`).
 * Contrato: `GET /api/v1/impact/{cables|boxes|olts}/{id}`.
 */
import type { components } from './generated/schema';

type Schemas = components['schemas'];

export type ImpactResponse = Schemas['ImpactResponse'];
export type ImpactTarget = Schemas['ImpactTarget'];
export type ImpactTotals = Schemas['ImpactTotals'];
export type ImpactBox = Schemas['ImpactBox'];
export type ImpactCustomer = Schemas['ImpactCustomer'];
export type ImpactOlt = Schemas['ImpactOlt'];

/** Tipo de item do impacto, como aparece no caminho da URL. */
export type ImpactKind = 'cables' | 'boxes' | 'olts';
