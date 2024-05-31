import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { TenantService } from './tenant.service';
import { IGetTenantRequest, IGetTenantResponse, ISetTenantStageRequest, ISetTenantStageResponse, IVerifyRequest, IVerifyResponse, IUpdateTenantProfileRequest, IUpdateTenantProfileResponse } from './interface/tenant.interface';

@Controller()
export class TenantController {
    constructor(private readonly tenantService: TenantService) {}

    @GrpcMethod('TenantService', 'GetTenant')
    async getTenant(data: IGetTenantRequest): Promise<IGetTenantResponse> {
        return await this.tenantService.getTenant(data);
    }

    @GrpcMethod('TenantService', 'UpdateTenantProfile')
    async updateTenant(data: IUpdateTenantProfileRequest): Promise<IUpdateTenantProfileResponse> {
        return await this.tenantService.updateTenantProfile(data);
    }

    @GrpcMethod('TenantService', 'Verify')
    async verifyTenant(data: IVerifyRequest): Promise<IVerifyResponse> {
        return await this.tenantService.verifyTenant(data);
    }

    @GrpcMethod('TenantService', 'setTenantStage')
    async setTenantStatus(data: ISetTenantStageRequest): Promise<ISetTenantStageResponse> {
        return await this.tenantService.setTenantStage(data);
    }
}
