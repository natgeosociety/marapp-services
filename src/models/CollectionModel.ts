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

import { get } from 'lodash';
import { Document, model, Model, Schema } from 'mongoose';
import mongooseIdValidator from 'mongoose-id-validator';
import { v4 as uuidv4 } from 'uuid';

import { forEachAsync } from '../helpers/util';
import { getLogger } from '../logging';
import { computeAreaKm2, computeShapeBbox, computeShapeCentroid, mergeGeojson } from '../services/geospatial';

import { Location, LocationModel, Metric } from '.';
import { checkWorkspaceRefs, generateSlugMiddleware, schemaOptions } from './middlewares';
import esPlugin, { IESPlugin } from './plugins/elasticsearch';
import slugifyPlugin, { ISlugifyPlugin } from './plugins/slugify';
import { getByIds } from './utils';
import { slugValidator } from './validators';

const logger = getLogger('CollectionModel');

export interface Collection {
  id?: any;
  slug: string;
  name: string;
  description: string;
  published: boolean;
  featured: boolean;
  organization: string;
  // computed;
  geojson: object;
  bbox2d?: number[];
  areaKm2?: number;
  centroid?: object;
  // auto-generated;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
  // relationships;
  locations?: string[] | Location[];
  metrics?: string[] | Metric[];
}

interface CollectionDocument extends Collection, Document {}

const CollectionSchema: Schema = new Schema(
  {
    _id: { type: String, default: uuidv4 },
    slug: {
      type: String,
      required: true,
      validate: slugValidator(),
    },
    name: { type: String, required: true },
    description: { type: String },
    published: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    organization: { type: String, required: true },
    version: { type: Number, default: 0 },
    geojson: { type: Object },
    bbox2d: { type: [Number] },
    areaKm2: { type: Number },
    centroid: { type: Object },
    locations: [{ type: Schema.Types.String, ref: 'Location' }],
    metrics: [{ type: Schema.Types.String, ref: 'Metric' }],
  },
  schemaOptions
);

// Unique compound index;
CollectionSchema.index({ slug: 1, organization: 1 }, { unique: true });

// Create "text" index for text search;
CollectionSchema.index({ name: 'text', type: 'text' });

// Create single field index for sorting;
CollectionSchema.index({ name: 1 });

// Ensure referenced object id(s) exist;
CollectionSchema.plugin(mongooseIdValidator, { allowDuplicates: false });

// Elasticsearch config
CollectionSchema.plugin(esPlugin, {
  settings: {
    analysis: {
      analyzer: {
        autocomplete_analyzer: {
          type: 'custom',
          tokenizer: 'autocomplete_tokenizer',
          filter: ['asciifolding', 'lowercase'],
        },
        autocomplete_search_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['asciifolding', 'lowercase'],
        },
      },
      tokenizer: {
        autocomplete_tokenizer: {
          type: 'edge_ngram',
          min_gram: 1,
          max_gram: 25,
          token_chars: ['letter', 'digit'],
        },
      },
    },
  },
  mappings: {
    properties: {
      name: { type: 'text', analyzer: 'autocomplete_analyzer', search_analyzer: 'autocomplete_search_analyzer' },
      published: { type: 'boolean' },
      organization: { type: 'keyword' },
    },
  },
});

// Slugify plugin;
CollectionSchema.plugin(slugifyPlugin, { uniqueField: 'slug', separator: '-' });

/**
 * Pre-validate middleware, handles slug auto-generation.
 */
CollectionSchema.pre('validate', generateSlugMiddleware('Collection'));

/**
 * Post-save middleware, computes geojson, areaKm2, geojson, centroid.
 */
CollectionSchema.post('find', async function (results) {
  await forEachAsync(<any>results, async (result: CollectionDocument) => {
    // @ts-ignore
    const locationIds = get(result, 'locations', []).map((e) => (typeof e === 'string' ? e : e.id));

    if (locationIds.length) {
      logger.debug(`found location references: ${locationIds.join(', ')}`);

      const geojsonArray = await getByIds(LocationModel, locationIds, { select: { geojson: 1 } });
      const geojson = mergeGeojson(<any>geojsonArray.map((e) => e.geojson));

      result.geojson = geojson;
      result.bbox2d = computeShapeBbox(geojson);
      result.areaKm2 = computeAreaKm2(geojson);
      result.centroid = computeShapeCentroid(geojson);
    }
  });
});

/**
 * Post-save middleware, computes geojson, areaKm2, geojson, centroid.
 */
CollectionSchema.post('findOne', async function (result: CollectionDocument) {
  // @ts-ignore
  const locationIds = get(result, 'locations', []).map((e) => (typeof e === 'string' ? e : e.id));

  if (locationIds.length) {
    logger.debug(`found location references: ${locationIds.join(', ')}`);

    const geojsonArray = await getByIds(LocationModel, locationIds, { select: { geojson: 1 } });
    const geojson = mergeGeojson(<any>geojsonArray.map((e) => e.geojson));

    result.geojson = geojson;
    result.bbox2d = computeShapeBbox(geojson);
    result.areaKm2 = computeAreaKm2(geojson);
    result.centroid = computeShapeCentroid(geojson);
  }
});

/**
 * Pre-save middleware, handles validation.
 */
CollectionSchema.pre('save', async function () {
  const locations: string[] = this.get('locations');
  const organization: string = this.get('organization');

  await checkWorkspaceRefs(this.model('Location'), locations, organization);
});

interface ICollectionModel extends Model<CollectionDocument>, IESPlugin, ISlugifyPlugin {}

export const CollectionModel: ICollectionModel = model<CollectionDocument>('Collection', CollectionSchema);
