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
import { body, param, query } from 'express-validator';
import { get, isEmpty } from 'lodash';
import urljoin from 'url-join';

import { DEFAULT_CONTENT_TYPE } from '../config';
import { ParameterRequiredError, RecordNotFound, UnsupportedOperationType } from '../errors';
import { MongooseQueryFilter, MongooseQueryParser } from '../helpers/mongoose';
import { getLogger } from '../logging';
import { AuthzGuards, AuthzRequest, guard } from '../middlewares/authz-guards';
import { LayerModel, LocationModel } from '../models';
import { getById } from '../models/utils';
import { createSerializer as createExportSerializer } from '../serializers/ExportSerializer';
import { exportImageToDownloadURL, exportImageToThumbnailURL, ExportType } from '../services/earthengine';

import { validate } from '.';

const logger = getLogger();

const getRouter = (basePath: string = '/', routePath: string = '/export') => {
  const router: Router = Router();
  const path = urljoin(basePath, routePath);

  const parser = new MongooseQueryParser();
  const queryFilters: MongooseQueryFilter[] = [{ key: 'published', op: '==', value: true }];

  router.get(
    `${path}/raster/:layerId/:locationId/`,
    validate([
      param('layerId').isString().trim().notEmpty(),
      param('locationId').isString().trim().notEmpty(),
      query('exportType').trim().isIn(Object.values(ExportType)),
      query('group').optional().isString().trim(),
    ]),
    guard.enforcePrimaryGroup({ multiple: true }),
    AuthzGuards.readExportsGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const layerId = req.params.layerId;
      const locationId = req.params.locationId;
      const exportType = req.query.exportType;

      const predefined = queryFilters.concat([{ key: 'organization', op: 'in', value: req.groups }]);
      const queryOptions = parser.parse(req.query, { predefined });

      if (!Object.values(ExportType).includes(<any>exportType)) {
        throw new UnsupportedOperationType('Unsupported export type.', 400);
      }
      const layer = await getById(LayerModel, layerId, queryOptions, ['slug']);
      if (!layer) {
        throw new RecordNotFound('Could not retrieve layer.', 404);
      }
      const location = await getById(LocationModel, locationId, queryOptions, ['slug']);
      if (!location) {
        throw new RecordNotFound('Could not retrieve location.', 404);
      }

      const source = get(layer.config, 'source');
      if (isEmpty(source)) {
        throw new ParameterRequiredError('Required config property "source" missing', 400);
      }
      const assetId = get(layer.config, 'source.assetId');
      if (!assetId) {
        throw new ParameterRequiredError('Required config property "source.assetId" missing', 400);
      }

      let downloadURL: string;
      if (exportType === ExportType.GEOTIFF) {
        downloadURL = await exportImageToDownloadURL(assetId, location.geojson);
      } else if (exportType === ExportType.THUMBNAIL) {
        const style = get(source, 'sldValue');
        downloadURL = await exportImageToThumbnailURL(assetId, location.geojson, style);
      }

      const code = 200;
      const response = createExportSerializer().serialize({ downloadURL });

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  return router;
};

export default { getRouter };
