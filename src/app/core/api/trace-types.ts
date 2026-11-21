/**
 * Tipos do rastreio da fibra, gerados do OpenAPI do backend (`npm run api:types`).
 * Contrato: `GET /api/v1/trace/{kind}/{id}?direction=UPSTREAM|DOWNSTREAM`.
 */
import type { components, operations } from './generated/schema';

type Schemas = components['schemas'];
type TraceParams = operations['trace']['parameters'];

export type TraceResponse = Schemas['TraceResponse'];
export type TraceStep = Schemas['TraceStep'];
export type TraceBreak = Schemas['TraceBreak'];
export type TraceBranch = Schemas['TraceBranch'];
export type TraceItem = Schemas['TraceItem'];
export type TraceCustomer = Schemas['TraceCustomer'];
export type TraceBreakReason = NonNullable<TraceBreak['reason']>;
export type TraceStatus = NonNullable<TraceResponse['status']>;
export type TraceDirection = TraceParams['query']['direction'];
export type TraceKind = TraceParams['path']['kind'];
