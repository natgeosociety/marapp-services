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
import { ErrorRequestHandler, RequestHandler } from 'express';
import serverlessHttp from 'serverless-http';

import { getLogger } from '../logging';
import { expressFactory } from '../middlewares';
import { contextEvent, contextHttp } from '../middlewares/context';
import { apiKey, jwtError, jwtRSA } from '../middlewares/jwt';

const logger = getLogger();

/**
 * Base HTTP handler for Lambda function(s) that processes events.
 * @param handlers
 */
export const baseHttpHandler = <H extends RequestHandler | ErrorRequestHandler>(handlers: H[]): Handler => {
  return async (event, context) => {
    // See: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-context.html#nodejs-prog-model-context-properties
    context.callbackWaitsForEmptyEventLoop = false;

    const app = expressFactory(contextHttp, ...handlers);

    const handler = serverlessHttp(app);
    return handler(event, context);
  };
};

/**
 * Base async handler for Lambda function(s) that processes events.
 * @param handler
 */
export const contextEventHandler = (handler: Handler): Handler => {
  return async (event: SNSEvent, context: Context) => {
    const ctx = await contextEvent(event, context);
    return handler(ctx.event, ctx.context, null);
  };
};

/**
 * Wrapper for non-authenticated handlers.
 * @param handlers
 */
export const openHttpHandler = (...handlers: RequestHandler[]): Handler => baseHttpHandler(handlers);

/**
 * Wrapper for authenticated handlers.
 * @param handlers
 */
export const authHttpHandler = (...handlers: RequestHandler[]): Handler =>
  baseHttpHandler([jwtRSA(true), jwtError, ...handlers]);

/**
 * Wrapper for (optional) anonymous handlers.
 * @param handlers
 */
export const anonymousHttpHandler = (...handlers: RequestHandler[]): Handler =>
  baseHttpHandler([jwtRSA(false), jwtError, ...handlers]);

/**
 * Wrapper for system handlers (apiKey).
 * @param handlers
 */
export const systemHttpHandler = (...handlers: RequestHandler[]): Handler => baseHttpHandler([apiKey, ...handlers]);
