/**
 * Module for cache - Redis
 * */

import { CacheModule as cacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { RedisOptions } from 'src/core/cache/configs/cache.config';

@Module({
    imports: [cacheModule.registerAsync(RedisOptions)],
})
export class CacheModule {}
