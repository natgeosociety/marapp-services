import { RedisClient } from 'redis';
import { promisify } from 'util';

import { getLogger } from '../logging';

const logger = getLogger();

export interface CacheService {
  get(key: string);
  set(key: string, value: string, ttl?: number);
  exists(key: string);
}

export class RedisCacheService implements CacheService {
  constructor(private client: RedisClient) {}

  /**
   * Get the value of a key.
   * @param key
   */
  get(key: string) {
    logger.debug(`retrieving cache key: ${key}`);

    return promisify(this.client.get).bind(this.client).call(this.client, key);
  }

  /**
   * Set the string value of a key.
   * @param key
   * @param value
   * @param ttl
   */
  set(key: string, value: string, ttl: number = 30) {
    logger.debug(`saving cache key: ${key}`);

    return promisify(this.client.set).bind(this.client).call(this.client, key, value, 'EX', ttl);
  }

  /**
   * Determine if a key exists.
   * @param key
   */
  exists(key: string) {
    logger.debug(`checking cache key: ${key}`);

    return promisify(this.client.exists).bind(this.client).call(this.client, key);
  }
}
