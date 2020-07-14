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

import { AuthorizationClient } from '@natgeosociety/auth0-authorization';
import { ManagementClient } from 'auth0';
import { Handler } from 'aws-lambda';
import { ErrorRequestHandler, Express, RequestHandler } from 'express';
import { Connection } from 'mongoose';
import { RedisClient } from 'redis';
import serverlessHttp from 'serverless-http';

import { MONGODB_URI, REDIS_URI } from '../config';
import { createMongoConnection } from '../helpers/mongoose';
import { createRedisConnection } from '../helpers/redis';
import { forEachAsync } from '../helpers/util';
import { getLogger } from '../logging';
import { expressFactory } from '../middlewares';
import { jwtError, jwtRSA, apiKey } from '../middlewares/jwt';
import { Auth0AuthzService, initAuthzClient } from '../services/auth0-authz';
import { Auth0ManagementService, initAuthMgmtClient } from '../services/auth0-management';
import { RedisCacheService } from '../services/cache-service';
import { initEarthEngine } from '../services/earthengine';

const logger = getLogger();

/**
 * Global context, available between invocations.
 */
interface SharedContext {
  mongoConn?: Promise<Connection>;
  redisClient?: Promise<RedisClient>;
  authzClient?: Promise<AuthorizationClient>;
  authMgmtClient?: Promise<ManagementClient>;
  ee?: Promise<void>;
}

let sharedContext: SharedContext;

/**
 * Express factory.
 * Creates a new instance and ensures global context is preserved.
 *
 * This makes the database connection(s) available between invocations of
 * the AWS Lambda function for the duration of the lifecycle of the function.
 */
class ExpressFactory {
  app: Express;
  handlers: (RequestHandler | ErrorRequestHandler)[];

  constructor(handlers: (RequestHandler | ErrorRequestHandler)[]) {
    this.app = expressFactory(...handlers);
    this.handlers = handlers;
  }

  async initializeContext() {
    if (!sharedContext) {
      logger.info('initializing shared context');

      // create connections;
      sharedContext = {
        mongoConn: createMongoConnection(MONGODB_URI),
        redisClient: createRedisConnection(REDIS_URI),
        authzClient: initAuthzClient(),
        authMgmtClient: initAuthMgmtClient(),
        ee: initEarthEngine(),
      };
    }

    // resolve connections;
    await forEachAsync(Object.entries(sharedContext), async ([key, conn]) => {
      sharedContext[key] = await conn;
    });

    // configure clients & services;
    this.app.locals.redisClient = await sharedContext.redisClient;
    this.app.locals.cacheService = new RedisCacheService(await sharedContext.redisClient);
    this.app.locals.authzService = new Auth0AuthzService(await sharedContext.authzClient);
    this.app.locals.authManagementService = new Auth0ManagementService(await sharedContext.authMgmtClient);

    logger.debug('shared context initialized');
  }
}

/**
 * Base handler for Lambda function(s) that processes events.
 * @param handlers
 */
export const baseHandler = <H extends RequestHandler | ErrorRequestHandler>(handlers: H[]): Handler => {
  return async (event, context) => {
    // See: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-context.html#nodejs-prog-model-context-properties
    context.callbackWaitsForEmptyEventLoop = false;

    const factory = new ExpressFactory(handlers);
    await factory.initializeContext(); // setting up cached context;

    const handler = serverlessHttp(factory.app);
    return handler(event, context);
  };
};

/**
 * Wrapper for non-authenticated handlers.
 * @param handlers
 */
export const open = (...handlers: RequestHandler[]): Handler => baseHandler(handlers);

/**
 * Wrapper for authenticated handlers.
 * @param handlers
 */
export const authenticated = (...handlers: RequestHandler[]): Handler => baseHandler([jwtRSA, jwtError, ...handlers]);

/**
 * Wrapper for system handlers (apiKey).
 * @param handlers
 */
export const system = (...handlers: RequestHandler[]): Handler => baseHandler([apiKey, ...handlers]);
