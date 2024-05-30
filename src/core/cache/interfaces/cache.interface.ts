/**
 * Interface for the Cache - to be implemented by the CacheService
 * */

import { CacheStoreFactory, CacheStore } from '@nestjs/cache-manager';

export interface CacheManagerOptions {
    store?: string | CacheStoreFactory | CacheStore;
    ttl?: number;
    max?: number;
    isCacheableValue?: (value: any) => boolean;
}
