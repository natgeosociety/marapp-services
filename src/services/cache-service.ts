/*
  Copyright 2018-2020 National Geographic Society

  Use of this software does not constitute endorsement by National Geographic
  Society (NGS). The NGS name and NGS logo may not be used for any purpose without
  written permission from NGS.

  Licensed under the Apache License, Version 2.0 (the "License"); you may not use
  this file except in compliance with the License. You may obtain a copy of the
  License at

      https://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software distributed
  under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
  CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

import { Redis } from 'ioredis';
import { isNil } from 'lodash';

import { getLogger } from '../logging';

const logger = getLogger();

export interface CacheService {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<string>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  getKeysByPrefix(keyPrefix: string): Promise<string[]>;
  deleteKeysByPrefix(keyPrefix: string): Promise<string[]>;
}

export class RedisCacheService implements CacheService {
  constructor(readonly redisClient: Redis) {}

  /**
   * Get the value of a key.
   * @param key
   * @return the value of key, or nil when key does not exist.
   */
  async get(key: string): Promise<any> {
    logger.debug('[get] cache key: %s', key);

    const response = await this.redisClient.get(key);
    return this.decode(response);
  }

  /**
   * Delete a key.
   * Removes the specified keys. A key is ignored if it does not exist.
   * @param key
   * @return The number of keys that were removed.
   */
  async del(key: string): Promise<number> {
    logger.debug('[del] cache key: %s', key);

    return this.redisClient.del(key);
  }

  /**
   * Set the string value of a key.
   * @param key
   * @param value
   * @param ttl
   * @return Simple string reply: OK if SET was executed correctly.
   */
  async set(key: string, value: string, ttl: number = 60): Promise<string> {
    logger.debug('[set] cache key: %s', key);

    return this.redisClient.set(key, this.encode(value), 'EX', ttl);
  }

  /**
   * Determine if a key exists.
   * @param key
   * @return 1 if the key exists. 0 if the key does not exist.
   */
  async exists(key: string): Promise<number> {
    logger.debug('[exists] cache key: %s', key);

    return this.redisClient.exists(key);
  }

  /**
   * Scan keys based on pattern to search.
   * @param keyPrefix
   */
  async getKeysByPrefix(keyPrefix: string): Promise<string[]> {
    // create a readable stream (object mode);
    const stream = this.redisClient.scanStream({ match: keyPrefix, count: 100 });
    logger.debug('[getKeysByPrefix] cache key: %s', keyPrefix);

    const keys: string[] = [];
    await new Promise((resolve, reject) => {
      stream.on('data', (resultKeys: string[]) => {
        if (resultKeys.length) {
          keys.push(...resultKeys);
        }
      });
      stream.on('end', () => resolve(keys));
      stream.on('error', (err) => reject(err));
    });
    return keys;
  }

  /**
   * Delete keys based on pattern to search.
   * @param keyPrefix: example 'prefix*'
   */
  async deleteKeysByPrefix(keyPrefix: string): Promise<string[]> {
    // create a readable stream (object mode);
    const stream = this.redisClient.scanStream({ match: keyPrefix, count: 100 });
    logger.debug('[deleteKeysByPrefix] cache key: %s', keyPrefix);

    const keys: string[] = [];
    await new Promise((resolve, reject) => {
      stream.on('data', (resultKeys: string[]) => {
        if (resultKeys.length) {
          keys.push(...resultKeys);
        }
      });
      stream.on('end', () => resolve(keys));
      stream.on('error', (err) => reject(err));
    });
    if (keys.length) {
      await this.redisClient.del(keys);
    }
    return keys;
  }

  /**
   * Encode value as string (normal string encoding).
   * @param value
   * @private
   */
  private encode(value: any): string {
    return JSON.stringify(value);
  }

  /**
   * Decode string encoded response.
   * @param response
   * @private
   */
  private decode(response: string): any {
    if (isNil(response)) {
      return response;
    }
    return JSON.parse(response);
  }
}
