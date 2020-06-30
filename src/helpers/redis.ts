import makeError from 'make-error';
import redis, { ClientOpts, RedisClient } from 'redis';

import { getLogger } from '../logging';

export const RedisError = makeError('RedisError');

const logger = getLogger('redis');

/**
 * Create a Redis connection.
 * @param redisURI
 * @param options
 * @return connection client
 */
export const createRedisConnection = async (redisURI: string, options: ClientOpts = {}): Promise<RedisClient> => {
  return new Promise(async (resolve, reject) => {
    try {
      logger.info('Establishing connection to Redis');

      const client = redis.createClient({ url: redisURI, ...options });

      client.on('ready', () => {
        logger.warn('Redis connection successful');
        resolve(client);
      });
      client.on('error', (err) => {
        logger.error(`Redis connection disconnected: ${err}`);
      });
    } catch (err) {
      logger.error(err);
      throw new RedisError(`Redis connection error. Failed to connect to server: ${redisURI}`);
    }
  });
};
