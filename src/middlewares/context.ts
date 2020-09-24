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

import { NextFunction, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { Connection } from 'mongoose';
import { hrtime } from 'process';
import { RedisClient } from 'redis';

import { MONGODB_URI, REDIS_URI } from '../config';
import { createMongoConnection } from '../helpers/mongoose';
import { createRedisConnection } from '../helpers/redis';
import { convertHrtime, forEachAsync } from '../helpers/util';
import { getLogger } from '../logging';
import { Auth0AuthzService } from '../services/auth0-authz';
import { Auth0ManagementService } from '../services/auth0-management';
import { RedisCacheService } from '../services/cache-service';
import { initEarthEngine } from '../services/earthengine';

const logger = getLogger();

interface SharedContext {
  mongoConn?: Promise<Connection>;
  redisClient?: Promise<RedisClient>;
}

interface EESharedContext {
  ee?: Promise<boolean>;
}

let sharedContext: SharedContext;
let eeSharedContext: EESharedContext;

/**
 * Shared context, available between invocations.
 * @param req
 * @param res
 * @param next
 */
export const globalContext = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const start = hrtime();

  if (!sharedContext) {
    logger.debug('[globalContext] shared context');

    // create connection(s);
    sharedContext = {
      mongoConn: createMongoConnection(MONGODB_URI),
      redisClient: createRedisConnection(REDIS_URI),
    };

    // resolve connection(s);
    await forEachAsync(Object.entries(sharedContext), async ([key, conn]) => {
      await conn;
    });
  }

  // set-up app locals;
  req.app.locals.redisClient = await sharedContext.redisClient;
  req.app.locals.cacheService = new RedisCacheService(await sharedContext.redisClient);
  req.app.locals.authzService = new Auth0AuthzService();
  req.app.locals.authManagementService = new Auth0ManagementService();

  const end = hrtime(start);
  const { milliseconds } = convertHrtime(end);

  logger.debug(`[globalContext] shared context duration: ${milliseconds}ms`);

  next();
});

/**
 * EarthEngine shared context, available between invocations.
 * @param req
 * @param res
 * @param next
 */
export const eeContext = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const start = hrtime();

  if (!eeSharedContext) {
    logger.debug('[eeContext] shared context');

    // create connection(s);
    eeSharedContext = {
      ee: initEarthEngine(),
    };

    // resolve connection(s);
    await eeSharedContext.ee;
  }
  const end = hrtime(start);
  const { milliseconds } = convertHrtime(end);

  logger.debug(`[eeContext] shared context duration: ${milliseconds}ms`);

  next();
});
