import { Module } from '@nestjs/common';
import { Mongoose } from 'mongoose';
import { TenantSchema } from 'src/models/user/schema/user.schema';
import { NodeMailerModule } from 'src/util/node_mailer/node_mailer.module';
import { VerifyAccountController } from './verify_account.controller';
import { VerifyAccountService } from './verify_account.service';

@Module({
    imports: [NodeMailerModule],
    controllers: [VerifyAccountController],
    providers: [
        VerifyAccountService,
        {
            provide: 'TENANT_MODEL',
            useFactory: (mongoose: Mongoose) => mongoose.model('tenant', TenantSchema),
            inject: ['DATABASE_CONNECTION'],
        },
    ],
})
export class VerifyAccountModule {}
