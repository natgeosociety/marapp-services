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
import makeError from 'make-error';

import { GOOGLE_SERVICE_ACCOUNT } from '../config';
import { ExposedError } from '../errors';
import { getLogger } from '../logging';

import { geojsonToGeometryCollection } from './geospatial';

export const EarthEngineError = makeError('EarthEngineError');
export const ExportError = makeError('ExportError', ExposedError);

const logger = getLogger();

export enum ExportType {
  GEOTIFF = 'geotiff',
  THUMBNAIL = 'thumbnail',
}

/**
 * Get a Download URL for the image, which always downloads a zipped GeoTIFF.
 * @param assetId
 * @param geojson
 */
export const exportImageToDownloadURL = async (assetId: string, geojson: any): Promise<string> => {
  const eeImage = ee.Image(assetId);

  const geometryCollection = geojsonToGeometryCollection(geojson);
  const geometry = ee.Geometry(geometryCollection);

  logger.debug('[exportImageToDownloadURL] exporting assetId: %s', assetId);

  // Export URL to download the specified image.
  return new Promise((resolve, reject) =>
    eeImage.getDownloadURL({ region: geometry }, (downloadId, err) => {
      if (downloadId) {
        resolve(downloadId);
      }
      if (err) {
        reject(err);
      }
    })
  )
    .then((downloadURL: string) => {
      logger.debug('[exportImageToDownloadURL] exported URL for %s: %s', assetId, downloadURL);
      return downloadURL;
    })
    .catch((err) => {
      logger.error(err);
      throw new ExportError('Could not export region for image', 413);
    });
};

/**
 * Get a thumbnail URL for this image.
 * @param assetId
 * @param geojson
 * @param sldStyle
 * @param format
 * @return
 */
export const exportImageToThumbnailURL = async (
  assetId: string,
  geojson: any,
  sldStyle: string = null,
  format: 'png' | 'jpg' = 'jpg'
): Promise<string> => {
  let eeImage = ee.Image(assetId);
  if (sldStyle) {
    eeImage = eeImage.sldStyle(sldStyle); // apply styled layer descriptor (SLD);
  }
  const geometryCollection = geojsonToGeometryCollection(geojson);
  const geometry = ee.Geometry(geometryCollection);

  logger.debug('[exportImageToThumbnailURL] exporting assetId: %s', assetId);

  // Export URL to download the specified image.
  return new Promise((resolve, reject) =>
    eeImage.getThumbURL({ image: eeImage, region: geometry, format: format }, (thumbId, err) => {
      if (thumbId) {
        resolve(thumbId);
      }
      if (err) {
        reject(err);
      }
    })
  )
    .then((thumbUrl: string) => {
      logger.debug('[exportImageToThumbnailURL] exported URL for %s: %s', assetId, thumbUrl);
      return thumbUrl;
    })
    .catch((err) => {
      logger.error(err);
      throw new ExportError('Could not generate thumbnail for image', 413);
    });
};

/**
 * Initialize the EE library.
 * Authenticate using a service account.
 */
export const initEarthEngine = async (): Promise<boolean> => {
  const credentials = JSON.parse(GOOGLE_SERVICE_ACCOUNT);

  return new Promise(async (resolve, reject) => {
    logger.info('Initializing EE client library.');

    const onInitSuccess = () => {
      logger.warn('Successfully initialized the EE client library.');
      resolve(true);
    };
    const onInitError = (err) => {
      logger.error(err);
      throw new EarthEngineError(`EE client library failed to initialize. ${err}`);
    };

    const onSuccess = () => {
      logger.info('EE authentication succeeded.');
      ee.initialize(null, null, onInitSuccess, onInitError);
    };
    const onError = (err) => {
      logger.error(err);
      throw new EarthEngineError(`EE authentication failed. ${err}`);
    };
    ee.data.authenticateViaPrivateKey(credentials, onSuccess, onError);
  });
};
