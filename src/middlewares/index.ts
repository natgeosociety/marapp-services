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

import { json, urlencoded } from 'body-parser';
import compression from 'compression';
import cors from 'cors';
import express, { ErrorRequestHandler, Express, RequestHandler } from 'express';
import cacheControl from 'express-cache-controller';
import morgan from 'morgan';
import responseTime from 'response-time';

import { MAX_PAYLOAD_SIZE } from '../config';

import { errorHandler } from './errors';

export const expressFactory = (...handlers: (RequestHandler | ErrorRequestHandler)[]): Express => {
  const app: Express = express();

  // middlewares;
  app.use(urlencoded({ extended: true, limit: MAX_PAYLOAD_SIZE }));
  app.use(json({ limit: MAX_PAYLOAD_SIZE }));
  app.use(cors({ origin: '*' }));
  app.use(cacheControl({ noCache: true }));
  app.use(compression()); // compress all responses;
  app.use(morgan('tiny'));
  app.use(responseTime());

  if (handlers.length) {
    app.use(handlers);
  }
  // error-handling middleware;
  app.use(errorHandler);

  return app;
};
