import { Observable } from 'rxjs';
import {
    CreateTenantRequest,
    FindTenantByDomainRequest,
    TenantResponse,
} from 'src/proto_build/services/tenant/tenant_pb';

export interface CreateTenantService {
    createTenant(data: ICreateTenantRequest): Observable<ICreateTenantResponse>;
    findTenantByDomain(data: IFindTenantByDomainRequest): Observable<ICreateTenantResponse>;
}

export interface ICreateTenantRequest extends CreateTenantRequest.AsObject {}

export interface ICreateTenantResponse extends TenantResponse.AsObject {}

export interface IFindTenantByDomainRequest extends FindTenantByDomainRequest.AsObject {}
