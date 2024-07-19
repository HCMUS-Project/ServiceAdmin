import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Mongoose } from 'mongoose';
import { TenantSchema } from 'src/models/user/schema/user.schema';
import { Jwt } from 'src/util/jwt/jwt';
// import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { TenantProfileSchema } from 'src/models/user/schema/profile.schema';
import { ExternalServiceModule } from 'src/feature/externalServices/external.module';
import { CreateTenantAdminService } from 'src/feature/externalServices/tenant/createTenant/createTenant.service';
import { CreateTenantProfileAdminService } from 'src/feature/externalServices/tenant/createTenantProfile/createTenantProfile.service';
import {ManageTenantController} from './tenant.controller';

@Module({
    imports: [
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
            }),
        }),
        ExternalServiceModule,
    ],
    controllers: [ManageTenantController],
    providers: [
        Jwt,
        TenantService,
        {
            provide: 'TENANT_MODEL',
            useFactory: (mongoose: Mongoose) => mongoose.model('tenant', TenantSchema),
            inject: ['DATABASE_CONNECTION'],
        },
        {
            provide: 'TENANTPROFILE_MODEL',
            useFactory: (mongoose: Mongoose) =>
                mongoose.model('tenantprofile', TenantProfileSchema),
            inject: ['DATABASE_CONNECTION'],
        },
        CreateTenantAdminService,
        CreateTenantProfileAdminService,
    ],
})
export class TenantModule {}
