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

import { Location } from '.';
import { schemaOptions } from './middlewares';
import {
  metricRemoveRefLinksOnDeleteMw,
  metricUpdateRefLinksOnUpdateMw,
  metricVersionIncOnUpdateMw,
} from './middlewares/metrics';

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

// Middlewares;
MetricSchema.pre('save', metricVersionIncOnUpdateMw());
MetricSchema.post('save', metricUpdateRefLinksOnUpdateMw());
MetricSchema.post('remove', metricRemoveRefLinksOnDeleteMw());

interface IMetricModel extends Model<MetricDocument> {}

export const MetricModel: IMetricModel = model<MetricDocument>('Metric', MetricSchema);
