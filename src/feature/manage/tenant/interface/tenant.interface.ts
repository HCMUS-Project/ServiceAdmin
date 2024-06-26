import {
    FullTenantProfileResponse,
    GetTenantRequest,
    SetTenantDomainRequest,
    SetTenantStageRequest,
    SetTenantStageResponse,
    Tenant,
    TenantProfile,
    VerifyRequest,
    VerifyResponse,
} from 'src/proto_build/admin/tenant_pb';

export interface ITenant extends Tenant.AsObject {}
export interface ITenantProfile extends TenantProfile.AsObject {}

export interface IGetTenantRequest extends GetTenantRequest.AsObject {}
export interface IGetTenantResponse extends Omit<IGetTenantRequest, 'tenantList'> {
    tenant: ITenant[];
}

export interface IVerifyRequest extends VerifyRequest.AsObject {}
export interface IVerifyResponse extends VerifyResponse.AsObject {}

export interface ISetTenantStageRequest extends SetTenantStageRequest.AsObject {}
export interface ISetTenantStageResponse extends SetTenantStageResponse.AsObject {}

export interface ISetTenantDomainRequest extends SetTenantDomainRequest.AsObject {}
// export interface IFullTenantProfileResponse
//     extends Omit<FullTenantProfileResponse, 'tenant' | 'tenantProfile'> {
//     tenant: ITenant;
//     tenantProfile: ITenantProfile;
// }

export interface IFullTenantProfileResponse extends FullTenantProfileResponse.AsObject {}
