import { Module } from '@nestjs/common';
import { Mongoose } from 'mongoose';
import { TenantProfileSchema } from 'src/models/user/schema/profile.schema';
import { TenantSchema } from 'src/models/user/schema/user.schema';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
    imports: [],
    controllers: [ProfileController],
    providers: [
        ProfileService,
        {
            provide: 'TENANT_MODEL',
            useFactory: (mongoose: Mongoose) => mongoose.model('tenant', TenantSchema),
            inject: ['DATABASE_CONNECTION'],
        },
        {
            provide: 'TENANTPROFILE_MODEL',
            useFactory: (mongoose: Mongoose) => mongoose.model('tenantprofile', TenantProfileSchema),
            inject: ['DATABASE_CONNECTION'],
        },
    ],
    exports: [],
})
export class ProfileModule {}
