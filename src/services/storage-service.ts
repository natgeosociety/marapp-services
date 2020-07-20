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

import makeError from 'make-error';
import urljoin from 'url-join';

import { NODE_ENV, S3_ASSETS_PATH_PREFIX } from '../config';
import { getLogger } from '../logging';

import { fetchURLToStream } from './fetch';
import { s3KeyExists, s3StreamUpload } from './s3';

const logger = getLogger();

export const StorageServiceError = makeError('StorageServiceError');

/**
 * Slippy map tilenames.
 *
 * Tiles are 256 × 256 pixel PNG files.
 * Each zoom level is a directory, each column is a subdirectory, and each tile in that column is a file.
 * Filename(url) format is /zoom/x/y.png
 */
export const uploadMapTile = async (
  tileUrl: string,
  layerId: string,
  mapId: string,
  zoom: number,
  x: number,
  y: number
): Promise<string> => {
  try {
    const keyPath = encodeTileKey(layerId, mapId, zoom, x, y);

    const { stream, contentType } = await fetchURLToStream(tileUrl);
    const meta = await s3StreamUpload(stream, keyPath, contentType);

    if (meta) {
      if (NODE_ENV === 'production') {
        return getCacheUrl(meta.key);
      }
      return meta.storageUrl;
    }
  } catch (err) {
    // silent catch;
  }
};

/**
 * Check if a map tilename exists in storage.
 */
export const existsMapTile = async (
  layerId: string,
  mapId: string,
  zoom: number,
  x: number,
  y: number
): Promise<string> => {
  try {
    const keyPath = encodeTileKey(layerId, mapId, zoom, x, y);
    const meta = await s3KeyExists(keyPath);

    if (meta) {
      if (NODE_ENV === 'production') {
        return getCacheUrl(meta.key);
      }
      return meta.storageUrl;
    }
  } catch (err) {
    // silent catch;
  }
};

const encodeTileKey = (
  layerId: string,
  mapId: string,
  zoom: number,
  x: number,
  y: number,
  pathPrefix: string = '/map-tiles'
): string => {
  const map = mapId.split('/').pop();
  const id = map.split('-')[0];
  const name = ['tile_', id, '.png'].join('');

  const path = urljoin(S3_ASSETS_PATH_PREFIX, pathPrefix, layerId, String(zoom), String(x), String(y), name);

  return path.startsWith('/') ? path.substr(1) : path; // remove prefix from S3 paths;
};

/**
 * Helper function. Returns the path-relative URL for the Cloudfront Distribution.
 * @param key
 */
const getCacheUrl = (key: string): string => {
  return urljoin('/', key);
};
