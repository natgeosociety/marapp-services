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
import { get, inRange, isEmpty } from 'lodash';
import urljoin from 'url-join';

import { API_MAP_TILES_TTL } from '../config';
import { InvalidParameterError, ParameterRequiredError, RecordNotFound, TileGenerationError } from '../errors';
import { getLogger } from '../logging';
import { LayerModel } from '../models';
import { getById } from '../models/utils';
import { existsMapTile, uploadMapTile } from '../services/storage-service';

const logger = getLogger();

// The zoom parameter is an integer between 0 (zoomed out) and 12 (zoomed in).
const MAX_ZOOM_LEVEL = 12; // 4096 x 4096 tiles

const getRouter = (basePath: string = '/', routePath: string = '/tiles') => {
  const router: Router = Router();
  const path = urljoin(basePath, routePath);

  router.use(
    `${path}/:layer/:z/:x/:y/`,
    cacheControl({ maxAge: Number(API_MAP_TILES_TTL) }),
    asyncHandler(async (req: Request, res: Response) => {
      const layerId = req.params.layer;

      const z = Number(req.params.z);
      if (!inRange(z, 0, MAX_ZOOM_LEVEL + 1)) {
        throw new InvalidParameterError(`Zoom level must be between 0-${MAX_ZOOM_LEVEL}`, 400);
      }
      const zoomGrid = Math.pow(2, MAX_ZOOM_LEVEL) - 1;

      const x = Number(req.params.x); // X goes from 0 to 2^zoom − 1
      if (!inRange(x, 0, zoomGrid + 1)) {
        throw new InvalidParameterError(`X coordinate must be between 0-${zoomGrid} (2^zoom − 1)`, 400);
      }
      const y = Number(req.params.y); // Y goes from 0 to 2^zoom − 1
      if (!inRange(y, 0, zoomGrid + 1)) {
        throw new InvalidParameterError(`Y coordinate must be between 0-${zoomGrid} (2^zoom − 1)`, 400);
      }

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
        let storageUrl = await existsMapTile(layerId, rawMap.mapid, z, x, y);

        if (!storageUrl) {
          storageUrl = await uploadMapTile(tileUrl, layerId, rawMap.mapid, z, x, y);
        } else {
          logger.debug(`tile key exists ${layerId}/${z}/${x}/${y}/: ${storageUrl}`);
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
