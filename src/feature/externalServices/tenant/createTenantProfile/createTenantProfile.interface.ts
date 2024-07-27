import { Observable } from 'rxjs';
import {
    CreateTenantProfileRequest,
    FindTenantProfileByTenantIdRequest,
    TenantProfileResponse,
} from 'src/proto_build/services/tenant/tenantProfile_pb';

export interface CreateTenantProfileService {
    createTenantProfile(
        data: ICreateTenantProfileRequest,
    ): Observable<ICreateTenantProfileResponse>;
    findTenantProfileByTenantId(
        data: IFindTenantProfileByTenantIdRequest,
    ): Observable<ICreateTenantProfileResponse>;
}

export interface ICreateTenantProfileRequest extends CreateTenantProfileRequest.AsObject {}

export interface ICreateTenantProfileResponse extends TenantProfileResponse.AsObject {}

export interface IFindTenantProfileByTenantIdRequest
    extends FindTenantProfileByTenantIdRequest.AsObject {}
