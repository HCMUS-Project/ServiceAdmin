import { Module } from '@nestjs/common';
import { SignUpController } from './sign_up.controller';
import { SignUpService } from './sign_up.service';
import { Mongoose } from 'mongoose';
import { TenantSchema } from 'src/models/user/schema/user.schema';
import { NodeMailerModule } from 'src/util/node_mailer/node_mailer.module';
import { TenantProfileSchema } from 'src/models/user/schema/profile.schema';

@Module({
    imports: [NodeMailerModule],
    controllers: [SignUpController],
    providers: [
        SignUpService,
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
})
export class SignUpModule {}
