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

import { json } from 'body-parser';
import { Request, Response, Router } from 'express';
import asyncHandler from 'express-async-handler';
import urljoin from 'url-join';

import { validateKeys } from '../helpers/util';
import { getLogger } from '../logging';
import { handleSNSMessage, SubscriptionError } from '../middlewares/subscriber';
import { Metric, MetricModel } from '../models';
import { save } from '../models/utils';
import { SuccessResponse } from '../types/response';

const logger = getLogger();

// Amazon SNS sends Content-Type 'text/plain; charset=UTF-8'
const plainTextParser = json({ type: 'text/plain' });

const getRouter = (basePath: string = '/', routePath: string = '/management/subscribe') => {
  const router: Router = Router();
  const path = urljoin(basePath, routePath);

  router.post(
    path,
    plainTextParser,
    handleSNSMessage,
    asyncHandler(async (req: Request, res: Response) => {
      const snsMessage = res.locals.snsMessage;
      if (!snsMessage) {
        throw new SubscriptionError('Could not read SNS message.', 500);
      }
      logger.debug(`Received SNS message: ${snsMessage.location}`);

      let success: boolean = true;
      try {
        validateKeys(snsMessage, ['slug', 'location', 'metric']);
        const { slug, location, metric } = snsMessage;

        const doc: Metric = { slug, location, metric };
        await save(MetricModel, <any>doc);
      } catch (err) {
        success = false;
      }

      const statusCode = 200;
      const body: SuccessResponse = { code: statusCode, data: { success } };

      res.status(statusCode).json(body);
    })
  );

  return router;
};

export default { getRouter };
