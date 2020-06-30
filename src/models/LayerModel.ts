import { Document, model, Model, Schema } from 'mongoose';
import mongooseIdValidator from 'mongoose-id-validator';
import { v4 as uuidv4 } from 'uuid';

import { getLogger } from '../logging';

import { schemaOptions } from './middlewares';
import esPlugin, { IESPlugin } from './plugins/elasticsearch';
import { isArrayEmptyValidator, isEmptyValidator, slugValidator } from './validators';

const logger = getLogger('LayerModel');

enum LayerTypeEnum {
  RASTER = 'raster',
  VECTOR = 'vector',
  GEOJSON = 'geojson',
  GROUP = 'group',
  VIDEO = 'video',
}

enum LayerProviderEnum {
  CARTODB = 'cartodb',
  GEE = 'gee',
  MAPBOX = 'mapbox',
  LEAFLET = 'leaflet',
}

enum LayerCategoryEnum {
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
}

export interface Layer {
  id?: any;
  slug: string;
  name: string;
  description: string;
  type: LayerTypeEnum;
  provider: LayerProviderEnum;
  category: LayerCategoryEnum;
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
LayerSchema.index({ name: 'text', type: 'text' });

// Create single field index for sorting;
LayerSchema.index({ name: 1 });

/**
 * Pre-save middleware, handles versioning.
 */
LayerSchema.pre('save', async function () {
  if (this.isModified()) {
    logger.debug('schema changes detected, incrementing version');

    const version = this.isNew ? this.get('version') : this.get('version') + 1;

    this.set({ version });
  }
});

/**
 * Post-remove middleware, removes references from other documents.
 */
LayerSchema.post('remove', async function () {
  const id: string = this.get('id');

  const resWidget = await this.model('Widget').updateMany(
    { layers: { $in: [id] } },
    { $pull: { layers: { $in: [id] } } }
  );
  logger.debug(`removed reference: ${id} from ${resWidget.nModified} widget(s)`);

  const resDashboard = await this.model('Dashboard').updateMany(
    { layers: { $in: [id] } },
    { $pull: { layers: { $in: [id] } } }
  );
  logger.debug(`removed reference: ${id} from ${resDashboard.nModified} dashboard(s)`);

  const resLayer = await this.model('Layer').updateMany(
    { references: { $in: [id] } },
    { $pull: { references: { $in: [id] } } }
  );
  logger.debug(`removed reference: ${id} from ${resLayer.nModified} layer(s)`);
});

interface ILayerModel extends Model<LayerDocument>, IESPlugin {}

export const LayerModel: ILayerModel = model<LayerDocument>('Layer', LayerSchema);
