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

import { Context, Handler, SNSEvent } from 'aws-lambda';
import { NextFunction, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { Connection } from 'mongoose';
import { performance } from 'perf_hooks';
import { RedisClient } from 'redis';

import { MONGODB_URI, REDIS_URI } from '../config';
import { createMongoConnection } from '../helpers/mongoose';
import { createRedisConnection } from '../helpers/redis';
import { forEachAsync } from '../helpers/util';
import { getLogger } from '../logging';
import { Auth0AuthzService } from '../services/auth0-authz';
import { Auth0ManagementService } from '../services/auth0-management';
import { RedisCacheService } from '../services/cache-service';
import { initEarthEngine } from '../services/earthengine';

const logger = getLogger();

export interface SharedContext {
  mongoConn?: Promise<Connection>;
  redisClient?: Promise<RedisClient>;
}

export interface EESharedContext {
  ee?: Promise<boolean>;
}

let sharedContextHttp: SharedContext;
let eeSharedContextHttp: EESharedContext;
let sharedContextSNS: SharedContext;

/**
 * Shared HTTP context, available between invocations.
 * @param req
 * @param res
 * @param next
 */
export const contextHttp = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const start = performance.now();

  if (!sharedContextHttp) {
    logger.debug('[contextHttp] shared context');

    // create connection(s);
    sharedContextHttp = {
      mongoConn: createMongoConnection(MONGODB_URI),
      redisClient: createRedisConnection(REDIS_URI),
    };

    // resolve connection(s);
    await forEachAsync(Object.entries(sharedContextHttp), async ([key, conn]) => {
      await conn;
    });
  }

  // set-up app locals;
  req.app.locals.redisClient = await sharedContextHttp.redisClient;
  req.app.locals.cacheService = new RedisCacheService(await sharedContextHttp.redisClient);
  req.app.locals.authzService = new Auth0AuthzService();
  req.app.locals.authManagementService = new Auth0ManagementService();

  const end = performance.now();
  logger.debug(`[contextHttp] shared context duration: ${end - start}(ms)`);

  next();
});

/**
 * EarthEngine HTTP shared context, available between invocations.
 * @param req
 * @param res
 * @param next
 */
export const eeContextHttp = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const start = performance.now();

  if (!eeSharedContextHttp) {
    logger.debug('[eeContextHttp] shared context');

    // create connection(s);
    eeSharedContextHttp = {
      ee: initEarthEngine(),
    };

    // resolve connection(s);
    await eeSharedContextHttp.ee;
  }

  const end = performance.now();
  logger.debug(`[eeContextHttp] shared context duration: ${end - start}(ms)`);

  next();
});

/**
 * Shared event context, available between invocations.
 * @param event
 * @param context
 */
export const contextEvent = async (event: SNSEvent, context: Context) => {
  const start = performance.now();

  if (!sharedContextSNS) {
    logger.debug('[contextEvent] shared context');

    // create connection(s);
    sharedContextSNS = {
      mongoConn: createMongoConnection(MONGODB_URI),
      redisClient: createRedisConnection(REDIS_URI),
    };

    // resolve connection(s);
    await forEachAsync(Object.entries(sharedContextSNS), async ([key, conn]) => {
      await conn;
    });
  }

  const end = performance.now();
  logger.debug(`[contextEvent] shared context duration: ${end - start}(ms)`);

  return { event, context };
};
