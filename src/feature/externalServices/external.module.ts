import { Module } from '@nestjs/common';
import { ClientProxyFactory, ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
@Module({
    imports: [ClientsModule],
    providers: [
        {
            provide: 'GRPC_ADMIN_TENANTS',
            useFactory: (configService: ConfigService) => {
                return ClientProxyFactory.create({
                    transport: Transport.GRPC,
                    options: {
                        package: ['tenant', 'tenantProfile'],
                        protoPath: join(__dirname, '../../../src/proto/main.proto'),
                        url: configService.get<string>('TENANT_SERVICE_URL'),
                        loader: {
                            enums: String,
                            objects: true,
                            arrays: true,
                            includeDirs: [join(__dirname, '../../../src/proto/')],
                        },
                    },
                });
            },
            inject: [ConfigService],
        },
    ],
    exports: [
        'GRPC_ADMIN_TENANTS', 
    ],
})
export class ExternalServiceModule {}
