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

import { get, isNil } from 'lodash';
import { Model, SchemaOptions } from 'mongoose';
import { Document } from 'mongoose';

import { DocumentError, DocumentVersionError } from '../../errors';
import { getLogger } from '../../logging';

const logger = getLogger();

/**
 * Mongo default schema options.
 */
export const schemaOptions: SchemaOptions = {
  toObject: {
    transform: function (doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    },
  },
  toJSON: {
    transform: function (doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    },
  },
  timestamps: true,
  minimize: false, // store empty objects;
  collation: { locale: 'en_US', caseLevel: true, numericOrdering: true }, // case insensitive sorting, sort numeric substrings based on their numeric value;
};

/**
 * Auto-generate model slug middleware.
 * @param modelName
 */
export const generateSlugMw = function (modelName: string) {
  const fn = async function () {
    const model = this.model(modelName);
    if (!model) {
      throw new Error(`Model not found for name: ${modelName}`);
    }
    const slug: string = this.get('slug');
    const name: string = this.get('name');
    const organization: string = this.get('organization');

    if (!slug && name) {
      this.set('slug', await model.getUniqueSlug(name, { organization }));
    }
  };
  return fn;
};

/**
 * Validate document references.
 * References need to belong to the same workspace/organization.
 * @param model
 * @param refIds
 * @param organization
 * @param allowPublicResource
 */
export const checkWorkspaceRefs = async <T extends Document>(
  model: Model<T>,
  refIds: string[],
  organization: string,
  allowPublicResource: boolean = false
): Promise<void> => {
  if (!organization) {
    throw new Error('Missing required parameter: organization');
  }
  if (refIds && refIds.length) {
    logger.debug('[checkWorkspaceRefs] checking references for organization %s: %s', organization, refIds);

    const res: any[] = await model.find(<any>{ _id: { $in: refIds } }).select(['organization', 'publicResource']);
    const isValid = res.every(
      (r) => r?.organization === organization || (allowPublicResource && r?.publicResource === true)
    );
    if (!isValid) {
      throw new DocumentError('Could not save document. Invalid references saved on document.', 400);
    }
  }
};

/**
 * Pre-save middleware.
 *
 * Handles version increment on document change.
 */
export const versionIncOnUpdateMw = function (modelName: string) {
  const fn = async function () {
    if (this.isModified()) {
      const id: string = this.get('id');

      logger.debug('[versionIncOnUpdateMw] schema changes detected, inc version for: %s', id);

      await this.model(modelName).findOneAndUpdate({ _id: id }, { $inc: { version: 1 } });
    }
  };
  return fn;
};

/**
 * Pre-save middleware.
 *
 * Handles optimistic version control on updates using a version key.
 * Compares client version and system version if version field present in update.
 */
export const optimisticVersionControlOnUpdateMw = function (modelName: string, versionKey: string = 'version') {
  const fn = async function () {
    const model = this.model(modelName);
    if (!model) {
      throw new Error(`Model not found for name: ${modelName}`);
    }
    const id = this.get('id');
    const clientVersion = this.get(versionKey);

    // check versions if explicitly sent by client in update;
    if (!isNil(clientVersion)) {
      logger.debug('[optimisticVersionControlOnUpdateMw] checking version for: %s', id);

      const res = await model.findOne({ _id: id }).select([versionKey]);
      if (res) {
        const serverVersion = get(res, versionKey);
        logger.debug(
          '[optimisticVersionControlOnUpdateMw] comparing version for: %s [clientVer: %s, serverVer: %s]',
          id,
          clientVersion,
          serverVersion
        );

        // condition for the versions matching;
        if (clientVersion !== serverVersion) {
          throw new DocumentVersionError('The client version does not match the server version.', 400);
        }
      }
    }
  };
  return fn;
};
