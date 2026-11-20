/**
 * Tipos da importação de rede (KMZ/KML), gerados do OpenAPI do backend (`npm run api:types`).
 * Contrato: `POST /api/v1/imports/network`. Apelidos para o restante do front usar nomes curtos.
 */
import type { components } from './generated/schema';

type Schemas = components['schemas'];

export type ImportNetworkRequest = Schemas['NetworkImportRequest'];
export type ImportNetworkResponse = Schemas['NetworkImportResponse'];
export type ImportElement = Schemas['ElementItem'];
export type ImportCable = Schemas['CableItem'];
export type ImportEnd = Schemas['EndpointRef'];
