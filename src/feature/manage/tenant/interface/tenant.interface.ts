import { GetTenantRequest, 
    SetTenantStageRequest, 
    SetTenantStageResponse, 
    Tenant, 
    VerifyRequest, 
    VerifyResponse 

} from 'src/proto_build/admin/tenant_pb';

export interface ITenant extends Tenant.AsObject {}

export interface IGetTenantRequest extends GetTenantRequest.AsObject {}
export interface IGetTenantResponse extends Omit<IGetTenantRequest, 'tenantList'> {
    tenant: ITenant[];
}

export interface IVerifyRequest extends VerifyRequest.AsObject {}
export interface IVerifyResponse extends VerifyResponse.AsObject {}

export interface ISetTenantStageRequest extends SetTenantStageRequest.AsObject {}
export interface ISetTenantStageResponse extends SetTenantStageResponse.AsObject {}

