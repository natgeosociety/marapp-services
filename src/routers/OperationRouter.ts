import { Response, Router } from 'express';
import asyncHandler from 'express-async-handler';
import urljoin from 'url-join';

import { API_BASE, DEFAULT_CONTENT_TYPE } from '../config';
import { forEachAsync } from '../helpers/util';
import { getLogger } from '../logging';
import { AuthzRequest } from '../middlewares/authz-guards';
import { CollectionModel, DashboardModel, LayerModel, LocationModel, WidgetModel } from '../models';
import { SuccessResponse } from '../types/response';

const logger = getLogger();

const getRouter = (basePath: string = API_BASE, routePath: string = '/operations') => {
  const router: Router = Router();
  const path = urljoin(basePath, routePath);

  router.get(
    `${path}/reindex`,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      logger.debug('reindexing es records');

      const models = [LocationModel, CollectionModel, LayerModel, WidgetModel, DashboardModel];
      await forEachAsync(models, async (model) => model.esSync());

      const code = 200;
      const success = true;
      const response: SuccessResponse = { code, data: { success } };

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  return router;
};

export default { getRouter };
