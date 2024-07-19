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
export class ManageTenantController {
    constructor(private readonly tenantService: TenantService) {}

    @GrpcMethod('ManageTenantService', 'GetTenant')
    async getTenant(data: IGetTenantRequest): Promise<IGetTenantResponse> {
        console.log(data)
        return await this.tenantService.getTenant(data);
    }

    @GrpcMethod('ManageTenantService', 'Verify')
    async verifyTenant(data: IVerifyRequest): Promise<IVerifyResponse> {
        return await this.tenantService.verifyTenant(data);
    }

    @GrpcMethod('ManageTenantService', 'SetTenantStage')
    async setTenantStatus(data: ISetTenantStageRequest): Promise<ISetTenantStageResponse> {
        return await this.tenantService.setTenantStage(data);
    }

    @GrpcMethod('ManageTenantService', 'SetTenantDomain')
    async setTenantDomain(data: ISetTenantDomainRequest): Promise<IFullTenantProfileResponse> {
        return await this.tenantService.setTenantDomain(data);
    }
}
