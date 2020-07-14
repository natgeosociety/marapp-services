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

import { boolean } from 'boolean';
import { Document, model, Model, Schema } from 'mongoose';
import mongooseIdValidator from 'mongoose-id-validator';
import { v4 as uuidv4 } from 'uuid';

import { KEEP_METRIC_VERSIONS } from '../config';
import { getLogger } from '../logging';

import { Location } from '.';
import { schemaOptions } from './middlewares';

const logger = getLogger('MetricModel');

export interface Metric {
  id?: any;
  slug: string;
  metric: object;
  // auto-generated;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
  // relationships;
  location?: string | Location;
}

interface MetricDocument extends Metric, Document {}

const MetricSchema: Schema = new Schema(
  {
    _id: { type: String, default: uuidv4 },
    slug: { type: String, required: true },
    metric: { type: Object, required: true },
    version: { type: Number, required: true, default: 0 },
    location: { type: Schema.Types.String, ref: 'Location', required: true },
  },
  schemaOptions
);

// Ensure referenced object id(s) exist;
MetricSchema.plugin(mongooseIdValidator, { allowDuplicates: false });

// Create single field index for sorting;
MetricSchema.index({ version: -1 });

// Unique compound index, enforce a unique constraint on compound indexes;
MetricSchema.index({ slug: 1, location: 1, version: 1 }, { unique: true });

/**
 * Pre-save middleware, handles versioning.
 */
MetricSchema.pre('save', async function () {
  const parent: string = this.get('location');
  const slug: string = this.get('slug');

  const res = await this.model('Metric').findOne({ location: parent, slug: slug }).sort('-version').select('version');
  if (res) {
    const version = res['version'] + 1; // inc previous version;
    this.set({ version });
  }
});

/**
 * Post-save middleware, saves child references to parent document.
 */
MetricSchema.post('save', async function () {
  const id: string = this.get('id');
  const slug: string = this.get('slug');
  const parent: string = this.get('location');

  // find previous versions;
  const ids = await this.model('Metric')
    .find({ _id: { $nin: [id] }, location: parent, slug: slug })
    .distinct('_id');

  if (ids.length && !boolean(KEEP_METRIC_VERSIONS)) {
    logger.debug(`removing previous versions: ${ids.join(', ')} for parent: ${id}`);

    await this.model('Metric').deleteMany({ _id: { $in: ids } });
  }

  logger.debug(`handling references for parent: ${parent} saved: ${id} removed: ${ids.join(', ')}`);

  const bulkOps = [
    // atomically adds a value to an array unless the value is already present;
    { updateOne: { filter: { _id: parent }, update: { $addToSet: { metrics: [id] } } } },
    // atomically removes all instances of a value or values that match a specified condition;
    { updateOne: { filter: { _id: parent }, update: { $pull: { metrics: { $in: ids } } } } },
  ];
  await this.model('Location').bulkWrite(bulkOps, { ordered: false });
});

/**
 * Post-remove middleware, remove child reference from parent doc when child is deleted.
 */
MetricSchema.post('remove', async function () {
  const id: string = this.get('id');
  const parent: string = this.get('location');

  logger.debug(`removing reference: ${id} from parent: ${parent}`);

  // atomically removes all instances of a value or values that match a specified condition;
  await this.model('Location').findByIdAndUpdate({ _id: parent }, { $pull: { metrics: { $in: [id] } } });
});

interface IMetricModel extends Model<MetricDocument> {}

export const MetricModel: IMetricModel = model<MetricDocument>('Metric', MetricSchema);
