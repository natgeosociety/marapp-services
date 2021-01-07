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

import { padStart } from 'lodash';
import { Model, Schema } from 'mongoose';
import { nanoid } from 'nanoid';
import slugify from 'slugify';

import { InvalidParameterError } from '../../errors';
import { getLogger } from '../../logging';

const logger = getLogger();

type IncrementType = 'shortid' | 'counter';

export interface ISlugifyPlugin {
  getUniqueSlug?(keyword: string, query?: {}, incType?: IncrementType): Promise<string>;
}

export default (schema: Schema, options: { uniqueField: string; separator: string }) => {
  async function isUnique(model: Model<any>, keyword: string, query: {}) {
    const exists = await model.exists({ ...query, [options.uniqueField]: keyword });
    if (exists) {
      logger.debug(`keyword exists for: ${keyword}`);
    }
    return !exists;
  }

  async function makeUniqueShortIdSlug(model: Model<any>, keyword: string, query: {}) {
    const slugifyOpts = { replacement: options.separator, lower: true, strict: true };
    let original = slugify(keyword, slugifyOpts);

    let count = 1;
    let maxAttempts = 10;

    let slug = original;
    while (!(await isUnique(model, slug, query)) && count <= maxAttempts) {
      const short = nanoid(6);
      slug = slugify(original + options.separator + short, slugifyOpts);
      count++;
    }
    if (count > maxAttempts) {
      throw Error(`Could not generate unique keyword from: ${keyword}`);
    }
    return slug;
  }

  async function makeUniqueCounterSlug(model: Model<any>, keyword: string, query: {}) {
    const slugifyOpts = { replacement: options.separator, lower: true, strict: true };
    let original = slugify(keyword, slugifyOpts);

    let count = 1;
    let maxAttempts = 10;
    const padding = 2;

    let slug = original;
    while (!(await isUnique(model, slug, query)) && count <= maxAttempts) {
      const counter = padStart(String(count), padding, '0');
      slug = slugify(original + options.separator + counter, slugifyOpts);
      count++;
    }
    if (count > maxAttempts) {
      throw Error(`Could not generate unique keyword from: ${keyword}`);
    }
    return slug;
  }

  schema.statics.getUniqueSlug = async function (keyword: string, query: {} = {}, incType: IncrementType = 'counter') {
    const model = this.model(this.modelName);
    if (incType === 'shortid') {
      return makeUniqueShortIdSlug(model, keyword, query);
    } else if (incType === 'counter') {
      return makeUniqueCounterSlug(model, keyword, query);
    } else {
      throw new InvalidParameterError('Unsupported slug increment type.', 400);
    }
  };
};
