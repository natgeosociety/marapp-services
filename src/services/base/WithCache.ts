import { Redis } from 'ioredis';
import { isNil } from 'lodash';

import { getLogger } from '../../logging';
import { CacheService, RedisCacheService } from '../cache-service';

const logger = getLogger();

interface WithCacheSpec {
  fromCache(cacheKey: string): Promise<any>;
  toCache(cacheKey: string, value: any): Promise<void>;
  removeCache(...cacheKeys: string[]): Promise<void>;
  mkCacheKey(...keys: any[]): string;
}

export abstract class WithCache implements WithCacheSpec {
  readonly cacheService: CacheService;
  readonly cacheTTL: number;

  protected constructor(client?: Redis, cacheTTL: number = 0) {
    if (client) {
      this.cacheService = new RedisCacheService(client);
    }
    this.cacheTTL = cacheTTL;
  }

  async fromCache(cacheKey: string): Promise<any> {
    if (this.cacheTTL > 0 && this.cacheService) {
      const hit = await this.cacheService.get(cacheKey);
      if (!isNil(hit)) {
        logger.debug('[fromCache] cache-hit: %s', cacheKey);
        return hit;
      }
      logger.debug('[fromCache] cache-miss: %s', cacheKey);
    }
  }

  async toCache(cacheKey: string, value: any): Promise<void> {
    if (this.cacheTTL > 0 && this.cacheService) {
      await this.cacheService.set(cacheKey, value, this.cacheTTL);
      logger.debug('[toCache] cache-save: %s', cacheKey);
    }
  }

  async removeCache(...cacheKeys: string[]): Promise<void> {
    if (this.cacheTTL > 0 && this.cacheService) {
      await this.cacheService.delete(...cacheKeys);
      logger.debug('[removeCache] cache-remove: %s', cacheKeys.join(','));
    }
  }

  async removeCachePrefix(cacheKeyPrefix: string): Promise<void> {
    if (this.cacheTTL > 0 && this.cacheService) {
      const keys = await this.cacheService.deleteKeysByPrefix(cacheKeyPrefix);
      logger.debug('[removeCachePrefix] cache-remove: %s', keys.join(','));
    }
  }

  mkCacheKey(...keys: any[]): string {
    return keys.map((k) => String(k)).join('-');
  }
}
