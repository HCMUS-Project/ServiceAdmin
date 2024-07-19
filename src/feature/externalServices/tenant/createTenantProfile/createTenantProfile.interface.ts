import { Observable } from 'rxjs'; 
import {CreateTenantProfileRequest, TenantProfileResponse} from 'src/proto_build/services/tenant/tenantProfile_pb';

export interface CreateTenantProfileService {
    creatTenantProfile(data: ICreateTenantProfileRequest): Observable<ICreateTenantProfileResponse>;
}

export interface ICreateTenantProfileRequest extends CreateTenantProfileRequest.AsObject {}

export interface ICreateTenantProfileResponse extends TenantProfileResponse.AsObject {}
