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

import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import urljoin from 'url-join';
import swaggerDocument from '../spec/swagger.yaml';

import { API_BASE, API_URL } from '../config';
import { AUTH0_DOMAIN, AUTH0_AUDIENCE, AUTH0_APPLICATION_CLIENT_ID } from '../config/auth0';
import { getLogger } from '../logging';

const logger = getLogger();

swaggerDocument.components.securitySchemes.OAuth2.flows.implicit.authorizationUrl = `https://${AUTH0_DOMAIN}/authorize?audience=${AUTH0_AUDIENCE}`;

const getRouter = (basePath: string = API_BASE, routePath: string = '/docs') => {
  const router: Router = Router();
  const path = urljoin(basePath, routePath);

  const req: any = {};
  const res: any = { send: () => {} };

  // Make a mock request to the swagger ui middleware to initialize it.
  // Workaround issue: https://github.com/scottie1984/swagger-ui-express/issues/178
  const swaggerUiMiddleware = swaggerUi.setup(swaggerDocument, null, {
    oauth: { clientId: AUTH0_APPLICATION_CLIENT_ID },
    oauth2RedirectUrl: `${API_URL}${path}/oauth2-redirect.html`,
  });
  swaggerUiMiddleware(req, res, () => {});

  router.use(path, swaggerUi.serveWithOptions({ redirect: false }), swaggerUiMiddleware);

  return router;
};

export default { getRouter };
