/**
 * ConfigService class.
 */

import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ServiceConfig {
    constructor(private configService: NestConfigService) {}

    get isProduction(): boolean {
        return this.environment === 'production';
    }

    get isDevelopment(): boolean {
        return this.environment === 'development';
    }

    get isTest(): boolean {
        return this.environment === 'test';
    }

    private get environment(): string {
        return this.configService.get<string>('NODE_ENV');
    }
}
