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

import { Layer, Widget } from '.';
import { generateSlugMiddleware, schemaOptions } from './middlewares';
import esPlugin, { IESPlugin } from './plugins/elasticsearch';
import slugifyPlugin, { ISlugifyPlugin } from './plugins/slugify';
import { slugValidator } from './validators';

const logger = getLogger('DashboardModel');

export interface Dashboard {
  id?: any;
  slug: string;
  name: string;
  description: string;
  published: string;
  organization: string;
  // auto-generated;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
  // relationships;
  layers?: string[] | Layer[];
  widgets?: string[] | Widget[];
}

interface DashboardDocument extends Dashboard, Document {}

const DashboardSchema: Schema = new Schema(
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
    organization: { type: String, required: true },
    version: { type: Number, default: 0 },
    layers: [{ type: Schema.Types.String, ref: 'Layer' }],
    widgets: [{ type: Schema.Types.String, ref: 'Widget' }],
  },
  schemaOptions
);

// Unique compound index;
DashboardSchema.index({ slug: 1, organization: 1 }, { unique: true });

// Ensure referenced object id(s) exist;
DashboardSchema.plugin(mongooseIdValidator, { allowDuplicates: false });

// Elasticsearch config
DashboardSchema.plugin(esPlugin, {
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

// Create "text" index for text search;
DashboardSchema.index({ name: 'text' });

// Create single field index for sorting;
DashboardSchema.index({ name: 1 });

// Slugify plugin;
DashboardSchema.plugin(slugifyPlugin, { uniqueField: 'slug', separator: '-' });

/**
 * Pre-validate middleware, handles slug auto-generation.
 */
DashboardSchema.pre('validate', generateSlugMiddleware('Dashboard'));

/**
 * Pre-save middleware, handles versioning.
 */
DashboardSchema.pre('save', async function () {
  if (this.isModified()) {
    logger.debug('schema changes detected, incrementing version');

    const version = this.isNew ? this.get('version') : this.get('version') + 1;

    this.set({ version });
  }
});

interface IDashboardModel extends Model<DashboardDocument>, IESPlugin, ISlugifyPlugin {}

export const DashboardModel: IDashboardModel = model<DashboardDocument>('Dashboard', DashboardSchema);
