import { Document, model, Model, Schema } from 'mongoose';
import mongooseIdValidator from 'mongoose-id-validator';
import { v4 as uuidv4 } from 'uuid';

import { getLogger } from '../logging';

import { Layer, Widget } from '.';
import { schemaOptions } from './middlewares';
import esPlugin, { IESPlugin } from './plugins/elasticsearch';
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
          tokenizer: 'lowercase',
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
DashboardSchema.index({ name: 'text' });

// Create single field index for sorting;
DashboardSchema.index({ name: 1 });

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

interface IDashboardModel extends Model<DashboardDocument>, IESPlugin {}

export const DashboardModel: IDashboardModel = model<DashboardDocument>('Dashboard', DashboardSchema);
