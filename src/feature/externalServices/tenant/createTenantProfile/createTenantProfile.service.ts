import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable, firstValueFrom } from 'rxjs';
import { GrpcPermissionDeniedException } from 'nestjs-grpc-exceptions';
import { GrpcItemNotFoundException } from 'src/common/exceptions/exceptions';
import {
    CreateTenantProfileService,
    ICreateTenantProfileRequest,
    ICreateTenantProfileResponse,
} from './createTenantProfile.interface';

@Injectable()
export class CreateTenantProfileAdminService {
    private createTenantProfileService: CreateTenantProfileService;

    constructor(@Inject('GRPC_ADMIN_TENANTS') private readonly client: ClientGrpc) {}

    onModuleInit() {
        this.createTenantProfileService =
            this.client.getService<CreateTenantProfileService>('TenantProfileService');
    }

    async createTenantProfile(
        data: ICreateTenantProfileRequest,
    ): Promise<ICreateTenantProfileResponse> {
        try {
            return await firstValueFrom(this.createTenantProfileService.createTenantProfile(data));
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
}
