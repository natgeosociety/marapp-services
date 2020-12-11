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

import ee from '@google/earthengine';
import { Request, Response, Router } from 'express';
import asyncHandler from 'express-async-handler';
import cacheControl from 'express-cache-controller';
import { body, param, query } from 'express-validator';
import { get, isEmpty } from 'lodash';
import urljoin from 'url-join';

import { API_MAP_TILES_TTL } from '../config';
import { ParameterRequiredError, RecordNotFound, TileGenerationError } from '../errors';
import { getLogger } from '../logging';
import { LayerModel } from '../models';
import { getById } from '../models/utils';
import { existsMapTile, uploadMapTile } from '../services/storage-service';

import { validate } from '.';

const logger = getLogger();

// The zoom parameter is an integer between 0 (zoomed out) and 12 (zoomed in).
const MAX_ZOOM_LEVEL = 12; // 4096 x 4096 tiles

const getRouter = (basePath: string = '/', routePath: string = '/tiles') => {
  const router: Router = Router();
  const path = urljoin(basePath, routePath);

  router.use(
    `${path}/:layer/:z/:x/:y/`,
    validate([
      param('layer').isString().trim().notEmpty(),
      param('z').trim().isInt({ min: 0, max: MAX_ZOOM_LEVEL }).toInt(),
      param('x')
        .trim()
        .isInt({ min: 0, max: Math.pow(2, MAX_ZOOM_LEVEL) })
        .toInt(),
      param('y')
        .trim()
        .isInt({ min: 0, max: Math.pow(2, MAX_ZOOM_LEVEL) })
        .toInt(),
    ]),
    cacheControl({ maxAge: Number(API_MAP_TILES_TTL) }),
    asyncHandler(async (req: Request, res: Response) => {
      const layerId = req.params.layer;

      const z = Number(req.params.z); // Z goes from 0 to MAX_ZOOM_LEVEL
      const x = Number(req.params.x); // X goes from 0 to 2^zoom − 1
      const y = Number(req.params.y); // Y goes from 0 to 2^zoom − 1

      const layer = await getById(LayerModel, layerId, {}, ['slug']);
      if (!layer) {
        throw new RecordNotFound(`Could not retrieve layer.`, 404);
      }

      const source = get(layer.config, 'source');
      if (isEmpty(source)) {
        throw new ParameterRequiredError('Required config property "source" missing', 400);
      }
      const assetId = get(layer.config, 'source.assetId');
      if (!assetId) {
        throw new ParameterRequiredError('Required config property "source.assetId" missing', 400);
      }

      const styleType = get(source, 'styleType');
      const style = get(source, 'sldValue');

      try {
        let eeImage = ee.Image(assetId);

        if (styleType === 'sld' && style) {
          eeImage = eeImage.sldStyle(style);
        }
        // Notice: when using Earth Engine in a Node.js environment, synchronous API calls should be avoided,
        // they prevent the app from handling other requests while waiting for a response from the Earth Engine API.
        // when using the Earth Engine API in Google Cloud Functions, synchronous requests are not supported.
        // See: https://developers.google.com/earth-engine/npm_install
        const rawMap = await new Promise<any>((resolve) => ee.data.getMapId({ image: eeImage }, (map) => resolve(map)));
        if (!rawMap) {
          throw new TileGenerationError(`Could not generate map tile for asset.`, 400);
        }
        const tileUrl = ee.data.getTileUrl(rawMap, x, y, z);
        let storageUrl = await existsMapTile(layer.id, rawMap.mapid, z, x, y);

        if (!storageUrl) {
          storageUrl = await uploadMapTile(tileUrl, layer.id, rawMap.mapid, z, x, y);
        } else {
          logger.debug(`tile key exists ${layer.id}/${z}/${x}/${y}/: ${storageUrl}`);
        }

        res.redirect(301, storageUrl);
      } catch (err) {
        logger.error(err);

        throw err;
      }
    })
  );

  return router;
};

export default { getRouter };
