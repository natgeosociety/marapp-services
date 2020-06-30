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
