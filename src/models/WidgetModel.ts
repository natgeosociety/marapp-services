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

import { Layer, MetricModel } from '.';
import { schemaOptions } from './middlewares';
import esPlugin, { IESPlugin } from './plugins/elasticsearch';
import slugifyPlugin, { ISlugifyPlugin } from './plugins/slugify';
import { getDistinctValues } from './utils';
import {
  hasUniqueValuesValidator,
  isArrayEmptyValidator,
  isArrayReferenceValidator,
  isEmptyValidator,
  slugValidator,
} from './validators';

const logger = getLogger('WidgetModel');

export interface Widget {
  id?: any;
  slug: string;
  name: string;
  description: string;
  config: object;
  published: boolean;
  metrics: string[];
  organization: string;
  // auto-generated;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
  // relationships;
  layers?: string[] | Layer[];
}

interface WidgetDocument extends Widget, Document {}

const WidgetSchema: Schema = new Schema(
  {
    _id: { type: String, default: uuidv4 },
    slug: {
      type: String,
      required: true,
      validate: slugValidator(),
    },
    name: { type: String, required: true },
    description: { type: String },
    config: { type: Object, required: true, validate: isEmptyValidator() },
    published: { type: Boolean, default: false },
    metrics: {
      type: [String],
      required: true,
      validate: [isArrayEmptyValidator(), hasUniqueValuesValidator(), isArrayReferenceValidator(MetricModel, 'slug')],
    },
    organization: { type: String, required: true },
    version: { type: Number, default: 0 },
    layers: [{ type: Schema.Types.String, ref: 'Layer' }],
  },
  schemaOptions
);

// Unique compound index;
WidgetSchema.index({ slug: 1, organization: 1 }, { unique: true });

// Ensure referenced object id(s) exist;
WidgetSchema.plugin(mongooseIdValidator, { allowDuplicates: false });

// Elasticsearch config
WidgetSchema.plugin(esPlugin, {
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
          filter: ['asciifolding'],
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
WidgetSchema.index({ name: 'text' });

// Create single field index for sorting;
WidgetSchema.index({ name: 1 });

// Slugify plugin;
WidgetSchema.plugin(slugifyPlugin, { uniqueField: 'slug', separator: '-' });

// Dynamic enum options resolver;
WidgetSchema.statics.enumOptionsResolver = function () {
  return {
    metrics: () => getDistinctValues(MetricModel, 'slug'),
  };
};

/**
 * Pre-save middleware, handles versioning.
 */
WidgetSchema.pre('save', async function () {
  if (this.isModified()) {
    logger.debug('schema changes detected, incrementing version');

    const version = this.isNew ? this.get('version') : this.get('version') + 1;

    this.set({ version });
  }
});

/**
 * Post-remove middleware, removes references from other documents.
 */
WidgetSchema.post('remove', async function () {
  const id: string = this.get('id');

  const resDashboard = await this.model('Dashboard').updateMany({ widgets: { $in: [id] } }, { $pull: { widgets: id } });
  logger.debug(`removed reference: ${id} from ${resDashboard.nModified} dashboard(s)`);
});

interface IWidgetModel extends Model<WidgetDocument>, IESPlugin, ISlugifyPlugin {}

export const WidgetModel: IWidgetModel = model<WidgetDocument>('Widget', WidgetSchema);
