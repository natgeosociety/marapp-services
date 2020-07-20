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
