import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { TenantService } from './tenant.service';
import {
    IFullTenantProfileResponse,
    IGetTenantRequest,
    IGetTenantResponse,
    ISetTenantDomainRequest,
    ISetTenantStageRequest,
    ISetTenantStageResponse,
    IVerifyRequest,
    IVerifyResponse,
} from './interface/tenant.interface';

@Controller()
export class TenantController {
    constructor(private readonly tenantService: TenantService) {}

    @GrpcMethod('TenantService', 'GetTenant')
    async getTenant(data: IGetTenantRequest): Promise<IGetTenantResponse> {
        return await this.tenantService.getTenant(data);
    }

    @GrpcMethod('TenantService', 'Verify')
    async verifyTenant(data: IVerifyRequest): Promise<IVerifyResponse> {
        return await this.tenantService.verifyTenant(data);
    }

    @GrpcMethod('TenantService', 'setTenantStage')
    async setTenantStatus(data: ISetTenantStageRequest): Promise<ISetTenantStageResponse> {
        return await this.tenantService.setTenantStage(data);
    }

    @GrpcMethod('TenantService', 'setTenantDomain')
    async setTenantDomain(data: ISetTenantDomainRequest): Promise<IFullTenantProfileResponse> {
        return await this.tenantService.setTenantDomain(data);
    }
}
