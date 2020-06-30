import { Errback, NextFunction, Request, Response } from 'express';
import stripAnsi from 'strip-ansi';

import { ExposedError } from '../errors';
import { getLogger } from '../logging';
import { ErrorObject, ErrorResponse } from '../types/response';

const logger = getLogger('errors');

/**
 * Error handling middleware.
 * @param err
 * @param req
 * @param res
 * @param next
 */
export const errorHandler = async (err: Errback, req: Request, res: Response, next: NextFunction) => {
  if (err) {
    // @ts-ignore
    logger.error(err.stack || err);

    let statusCode;
    let errors: ErrorObject[];

    if (err instanceof ExposedError) {
      statusCode = err.code;
      if (err['errors']) {
        errors = err['errors'];
      } else {
        errors = [{ code: statusCode, title: err.name, detail: stripAnsi(err.message) }];
      }
    } else {
      statusCode = 500;
      errors = [{ code: statusCode, title: 'UnhandledError', detail: 'Internal Server Error' }];
    }

    const errorBody: ErrorResponse = { errors };
    res.status(statusCode).json(errorBody);
  }
};
