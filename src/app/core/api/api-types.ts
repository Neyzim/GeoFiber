/**
 * Tipos da API do GeoFiber, derivados do OpenAPI gerado em `generated/schema.d.ts`.
 * Para atualizar depois de mudanças no backend: `npm run api:types`.
 */
import type { components } from './generated/schema';

type Schemas = components['schemas'];

export type CoordinateDto = Schemas['CoordinateDto'];
export type ProblemDetail = Schemas['ProblemDetail'];

export type OltRequest = Schemas['OltRequest'];
export type OltResponse = Schemas['OltResponse'];
export type OltPortRequest = Schemas['OltPortRequest'];
export type OltPortResponse = Schemas['OltPortResponse'];

export type BoxRequest = Schemas['BoxRequest'];
export type BoxResponse = Schemas['BoxResponse'];

export type CableRequest = Schemas['CableRequest'];
export type CableResponse = Schemas['CableResponse'];
export type LooseTubeRequest = Schemas['LooseTubeRequest'];
export type LooseTubeResponse = Schemas['LooseTubeResponse'];
export type CableAttachmentRequest = Schemas['CableAttachmentRequest'];
export type CableAttachmentResponse = Schemas['CableAttachmentResponse'];

export type FiberRequest = Schemas['FiberRequest'];
export type FiberResponse = Schemas['FiberResponse'];
export type FiberStatusRequest = Schemas['FiberStatusRequest'];

export type TrayRequest = Schemas['TrayRequest'];
export type TrayResponse = Schemas['TrayResponse'];
export type SpliceRequest = Schemas['SpliceRequest'];
export type SpliceResponse = Schemas['SpliceResponse'];

export type SplitterRequest = Schemas['SplitterRequest'];
export type SplitterResponse = Schemas['SplitterResponse'];
export type SplitterPortUpdateRequest = Schemas['SplitterPortUpdateRequest'];
export type SplitterPortResponse = Schemas['SplitterPortResponse'];

export type ServicePortRequest = Schemas['ServicePortRequest'];
export type ServicePortResponse = Schemas['ServicePortResponse'];

export type ConnectionRequest = Schemas['ConnectionRequest'];
export type ConnectionResponse = Schemas['ConnectionResponse'];

export type CustomerRequest = Schemas['CustomerRequest'];
export type CustomerResponse = Schemas['CustomerResponse'];
export type CustomerHistoryResponse = Schemas['CustomerHistoryResponse'];

export type CableStructureRequest = Schemas['CableStructureRequest'];
export type CableStructureResponse = Schemas['CableStructureResponse'];
export type CableFiberResponse = Schemas['CableFiberResponse'];
export type FiberEndResponse = Schemas['FiberEndResponse'];
export type FiberEndLinkResponse = Schemas['FiberEndLinkResponse'];
export type AttachedCableResponse = Schemas['AttachedCableResponse'];
export type BoxOverviewResponse = Schemas['BoxOverviewResponse'];
/** Tipo de ligação de uma ponta de fibra. */
export type FiberLinkType = NonNullable<FiberEndLinkResponse['type']>;
/** Situação de uma ponta de fibra. */
export type FiberEndStatus = NonNullable<FiberEndResponse['status']>;

/** Situação de uso de OLT, caixa e cabo. */
export type InfrastructureStatus = NonNullable<BoxResponse['usageStatus']>;
export type BoxType = NonNullable<BoxResponse['type']>;
export type CableRole = NonNullable<CableResponse['role']>;
export type FiberStatus = NonNullable<FiberResponse['status']>;
/** Situação de portas de OLT, splitter e atendimento. */
export type PortStatus = NonNullable<ServicePortResponse['status']>;
export type FiberEnd = NonNullable<ServicePortResponse['fiberEnd']>;
/** As 12 cores ABNT/TIA de tubos e fibras. */
export type OpticalColor = NonNullable<FiberResponse['color']>;
export type SplitterRatio = NonNullable<SplitterResponse['ratio']>;
export type CustomerStatus = NonNullable<CustomerResponse['status']>;
export type AttachmentRole = NonNullable<CableAttachmentResponse['role']>;

export type LoginRequest = Schemas['LoginRequest'];
export type TokenResponse = Schemas['TokenResponse'];
export type CreateUserRequest = Schemas['CreateUserRequest'];
export type UserResponse = Schemas['UserResponse'];
export type UserRole = NonNullable<UserResponse['role']>;
export type SetActiveRequest = Schemas['SetActiveRequest'];
export type ResetPasswordRequest = Schemas['ResetPasswordRequest'];
