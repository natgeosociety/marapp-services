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

import { Document, model, Model, Schema } from 'mongoose';
import mongooseIdValidator from 'mongoose-id-validator';
import { v4 as uuidv4 } from 'uuid';

import { getLogger } from '../logging';

import { generateSlugMw, optimisticVersionControlOnUpdateMw, schemaOptions, versionIncOnUpdateMw } from './middlewares';
import {
  cacheBustingOnUpdateMw,
  checkRefLinksOnUpdateMw,
  removeLayerResourcesOnDeleteMw,
  removeRefLinksOnDeleteMw,
} from './middlewares/layers';
import esPlugin, { IESPlugin } from './plugins/elasticsearch';
import slugifyPlugin, { ISlugifyPlugin } from './plugins/slugify';
import { isArrayEmptyValidator, isEmptyValidator, slugValidator } from './validators';

const logger = getLogger('LayerModel');

export enum LayerTypeEnum {
  RASTER = 'raster',
  VECTOR = 'vector',
  GEOJSON = 'geojson',
  GROUP = 'group',
  VIDEO = 'video',
}

export enum LayerProviderEnum {
  CARTODB = 'cartodb',
  GEE = 'gee',
  MAPBOX = 'mapbox',
  LEAFLET = 'leaflet',
}

export enum LayerCategoryEnum {
  BIODIVERSITY = 'Biodiversity',
  CLIMATE_CARBON = 'Climate & Carbon',
  ECOSYSTEM_SERVICES = 'Ecosystem Services',
  HUMAN_IMPACT = 'Human Impact',
  LAND_COVER = 'Land Cover',
  MARINE = 'Marine',
  NATURAL_HAZARDS = 'Natural Hazards',
  PROTECTED_AREAS = 'Protected Areas',
  RESTORATION = 'Restoration',
  SOCIO_ECONOMIC = 'Socio-Economic',
  HABITATS_AND_BIOMES = 'Habitats and Biomes',
  PROTECTED_AND_CONSERVED_AREAS = 'Protected and Conserved Areas',
}

export interface Layer {
  id?: any;
  slug: string;
  name: string;
  description: string;
  primary: boolean;
  type: LayerTypeEnum;
  provider: LayerProviderEnum;
  category: [LayerCategoryEnum];
  config: object;
  published: boolean;
  organization: string;
  // auto-generated;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
  // relationships;
  references?: string[] | Layer[];
}

interface LayerDocument extends Layer, Document {}

const LayerSchema: Schema = new Schema(
  {
    _id: { type: String, default: uuidv4 },
    slug: {
      type: String,
      required: true,
      validate: slugValidator(),
    },
    name: { type: String, required: true },
    description: { type: String },
    primary: { type: Boolean, default: false },
    type: { type: String, enum: Object.values(LayerTypeEnum), required: true },
    provider: { type: String, enum: Object.values(LayerProviderEnum), required: true },
    category: {
      type: [String],
      enum: Object.values(LayerCategoryEnum),
      required: true,
      validate: isArrayEmptyValidator(),
    },
    config: { type: Object, required: true, validate: isEmptyValidator() },
    published: { type: Boolean, default: false },
    organization: { type: String, required: true },
    version: { type: Number, default: 0 },
    references: [{ type: Schema.Types.String, ref: 'Layer' }],
  },
  schemaOptions
);

// Unique compound index;
LayerSchema.index({ slug: 1, organization: 1 }, { unique: true });

// Ensure referenced object id(s) exist;
LayerSchema.plugin(mongooseIdValidator, { allowDuplicates: false });

// Elasticsearch config
LayerSchema.plugin(esPlugin, {
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
        autocomplete_search_tokenizer: {},
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

// Create "text" index for text search;
LayerSchema.index({ name: 'text', type: 'text' });

// Create single field index for sorting;
LayerSchema.index({ name: 1 });

// Create unique slugname plugin;
LayerSchema.plugin(slugifyPlugin, { uniqueField: 'slug', separator: '-' });

// Middlewares;
LayerSchema.pre('validate', generateSlugMw('Layer'));
LayerSchema.pre('save', optimisticVersionControlOnUpdateMw('Layer'));
LayerSchema.pre('save', checkRefLinksOnUpdateMw());
LayerSchema.pre('save', versionIncOnUpdateMw('Layer'));
LayerSchema.pre('save', cacheBustingOnUpdateMw());
LayerSchema.post('remove', removeRefLinksOnDeleteMw());
LayerSchema.post('remove', removeLayerResourcesOnDeleteMw());

interface ILayerModel extends Model<LayerDocument>, IESPlugin, ISlugifyPlugin {}

export const LayerModel: ILayerModel = model<LayerDocument>('Layer', LayerSchema);
