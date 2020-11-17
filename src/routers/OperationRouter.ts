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

import { Response, Router } from 'express';
import asyncHandler from 'express-async-handler';
import urljoin from 'url-join';

import { API_BASE, DEFAULT_CONTENT_TYPE } from '../config';
import { forEachAsync } from '../helpers/util';
import { getLogger } from '../logging';
import { AuthzRequest } from '../middlewares/authz-guards';
import { DashboardModel, LayerModel, LocationModel, WidgetModel } from '../models';
import { createSerializer as createStatusSerializer } from '../serializers/StatusSerializer';

const logger = getLogger();

const getRouter = (basePath: string = API_BASE, routePath: string = '/operations') => {
  const router: Router = Router();
  const path = urljoin(basePath, routePath);

  router.get(
    `${path}/reindex`,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      logger.debug('reindexing es records');

      const models = [LocationModel, LayerModel, WidgetModel, DashboardModel];
      await forEachAsync(models, async (model) => model.esSync());

      const code = 200;
      const response = createStatusSerializer().serialize({ success: true });

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  return router;
};

export default { getRouter };
