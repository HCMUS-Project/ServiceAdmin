import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable, firstValueFrom } from 'rxjs';
import { GrpcPermissionDeniedException } from 'nestjs-grpc-exceptions';
import {
    CreateTenantService,
    ICreateTenantRequest,
    ICreateTenantResponse,
    IFindTenantByDomainRequest,
} from './createTenant.interface';
import { GrpcItemNotFoundException } from 'src/common/exceptions/exceptions';

@Injectable()
export class CreateTenantAdminService {
    private createTenantService: CreateTenantService;

    constructor(@Inject('GRPC_ADMIN_TENANTS') private readonly client: ClientGrpc) {}

    onModuleInit() {
        this.createTenantService = this.client.getService<CreateTenantService>('TenantService');
    }

    async createTenant(data: ICreateTenantRequest): Promise<ICreateTenantResponse> {
        try {
            return await firstValueFrom(this.createTenantService.createTenant(data));
        } catch (e) {
            // console.log(e)
            let errorDetails: { error?: string };
            try {
                errorDetails = JSON.parse(e.details);
            } catch (parseError) {
                console.error('Error parsing details:', parseError);
                throw new GrpcItemNotFoundException(String(e));
            }
            // console.log(errorDetails);

            if (errorDetails.error == 'PERMISSION_DENIED') {
                throw new GrpcPermissionDeniedException('PERMISSION_DENIED');
            }
            if (errorDetails.error == 'TENANT_ALREADY_EXISTS') {
                throw new GrpcItemNotFoundException('TENANT_ALREADY_EXISTS');
            } else {
                throw new NotFoundException(
                    `Unhandled error type: ${errorDetails.error}`,
                    'Error not recognized',
                );
            }
        }
    }

    async findTenantByDomain(data: IFindTenantByDomainRequest): Promise<ICreateTenantResponse> {
        try {
            return await firstValueFrom(this.createTenantService.findTenantByDomain(data));
        } catch (e) {
            // console.log(e)
            let errorDetails: { error?: string };
            try {
                errorDetails = JSON.parse(e.details);
            } catch (parseError) {
                console.error('Error parsing details:', parseError);
                throw new GrpcItemNotFoundException(String(e));
            }
            // console.log(errorDetails);

            if (errorDetails.error == 'PERMISSION_DENIED') {
                throw new GrpcPermissionDeniedException('PERMISSION_DENIED');
            }
            if (errorDetails.error == 'TENANT_NOT_FOUND') {
                throw new GrpcItemNotFoundException('TENANT_NOT_FOUND');
            } else {
                throw new NotFoundException(
                    `Unhandled error type: ${errorDetails.error}`,
                    'Error not recognized',
                );
            }
        }
    }
}
