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

require('mongoose-geojson-schema'); // required by mongoose;

import { Document, model, Model, Schema } from 'mongoose';
import mongooseIdValidator from 'mongoose-id-validator';
import { v4 as uuidv4 } from 'uuid';

import { getLogger } from '../logging';

import { Metric } from '.';
import { generateSlugMw, optimisticVersionControlOnUpdateMw, schemaOptions, versionIncOnUpdateMw } from './middlewares';
import {
  checkRefLinksOnUpdateMw,
  computeCollectionGeoJSONMw,
  computeGeoJSONOnChangeMw,
  removeRefLinksOnDeleteMw,
  removeRefLinksOnUpdateMw,
} from './middlewares/locations';
import esPlugin, { IESPlugin } from './plugins/elasticsearch';
import slugifyPlugin, { ISlugifyPlugin } from './plugins/slugify';
import { requireOptionalFields, slugValidator } from './validators';

const logger = getLogger('LocationModel');

export enum LocationTypeEnum {
  COUNTRY = 'Country',
  JURISDICTION = 'Jurisdiction',
  BIOME = 'Biome',
  PROTECTED_AREA = 'Protected Area',
  SPECIES_AREA = 'Species Area',
  COLLECTION = 'Collection',
}

export interface Location {
  id?: any;
  slug: string;
  name: string;
  description: string;
  type: LocationTypeEnum;
  geojson?: object;
  published: boolean;
  featured: boolean;
  organization: string;
  publicResource: boolean;
  // computed;
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
  // calculated;
  intersections?: Location[];
}

interface LocationDocument extends Location, Document {}

const LocationSchema: Schema = new Schema(
  {
    _id: { type: String, default: uuidv4 },
    slug: {
      type: String,
      required: true,
      validate: slugValidator(),
    },
    name: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: Object.values(LocationTypeEnum), required: true },
    geojson: {
      type: Schema.Types.GeoJSON,
      minimize: false, // keep empty objects;
      required: function () {
        return this.type !== LocationTypeEnum.COLLECTION;
      },
    },
    published: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    organization: { type: String, required: true },
    publicResource: { type: Boolean, default: false, validate: requireOptionalFields(['published']) },
    version: { type: Number, default: 0 },
    bbox2d: { type: [Number] },
    areaKm2: { type: Number },
    centroid: { type: Object },
    locations: [
      {
        type: Schema.Types.String,
        ref: 'Location',
        required: function () {
          return this.type === LocationTypeEnum.COLLECTION;
        },
      },
    ],
    metrics: [{ type: Schema.Types.String, ref: 'Metric' }],
  },
  schemaOptions
);

// Unique compound index;
LocationSchema.index({ slug: 1, organization: 1 }, { unique: true });

// Create "2dsphere" index for geo-intersect queries on geometries;
LocationSchema.index({ 'geojson.features.geometry': '2dsphere' });

// Create "2dsphere" index for geo-intersect queries on geometries;
LocationSchema.index({ 'geojson.features.geometry': '2dsphere', published: 1 });

// Create "text" index for text search;
LocationSchema.index({ name: 'text', type: 'text' });

// Create single field index for sorting;
LocationSchema.index({ name: 1 });

// Ensure referenced object id(s) exist;
LocationSchema.plugin(mongooseIdValidator, { allowDuplicates: false });

// Elasticsearch config
LocationSchema.plugin(esPlugin, {
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
      name: {
        type: 'text',
        analyzer: 'autocomplete_analyzer',
        search_analyzer: 'autocomplete_search_analyzer',
      },
      published: { type: 'boolean' },
      organization: { type: 'keyword' },
      publicResource: { type: 'boolean' },
    },
  },
});

// Create unique slugname plugin;
LocationSchema.plugin(slugifyPlugin, { uniqueField: 'slug', separator: '-' });

// Middlewares;
LocationSchema.pre('validate', generateSlugMw('Location'));
LocationSchema.pre('save', optimisticVersionControlOnUpdateMw('Location'));
LocationSchema.pre('save', computeGeoJSONOnChangeMw());
LocationSchema.pre('save', checkRefLinksOnUpdateMw());
LocationSchema.pre('save', versionIncOnUpdateMw('Location'));
LocationSchema.post('save', removeRefLinksOnUpdateMw());
LocationSchema.post('remove', removeRefLinksOnDeleteMw());
LocationSchema.post('find', computeCollectionGeoJSONMw());
LocationSchema.post('findOne', computeCollectionGeoJSONMw());

interface ILocationModel extends Model<LocationDocument>, IESPlugin, ISlugifyPlugin {}

export const LocationModel: ILocationModel = model<LocationDocument>('Location', LocationSchema);
