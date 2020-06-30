import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import urljoin from 'url-join';
const swaggerDocument = require('../spec/swagger.json');

import { API_BASE } from '../config';
import { getLogger } from '../logging';

const logger = getLogger();

const getRouter = (basePath: string = API_BASE, routePath: string = '/docs') => {
  const router: Router = Router();
  const path = urljoin(basePath, routePath);

  router.use(path, swaggerUi.serveWithOptions({ redirect: false }));
  router.get(path, swaggerUi.setup(swaggerDocument));

  return router;
};

export default { getRouter };
