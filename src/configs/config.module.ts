/**
 * ConfigModule is a global module that imports the ConfigModule from the @nestjs/config package.
 */

import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ServiceConfig } from 'src/configs/service/service.config';
import appConfig from './app/app.config';
import dataBaseConfig from './database/mongo/mongo.config';
import nodeMailerConfig from './node_mailer/node_mailer.config';
import cacheConfig from './cache/cache.config';

@Global()
@Module({
    imports: [
        NestConfigModule.forRoot({
            envFilePath: ['.env'],
            isGlobal: true,
            load: [appConfig, dataBaseConfig, nodeMailerConfig, cacheConfig],
        }),
    ],
    controllers: [],
    providers: [ServiceConfig],
    exports: [ServiceConfig],
})
export class ConfigsModule {}
