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
