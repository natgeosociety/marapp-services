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

import { get, isEmpty } from 'lodash';
import { Model } from 'mongoose';

import { getDistinctValues } from '../utils';

// regular expression used for basic parsing of the slug.
const slugRegexp = new RegExp('^[a-z0-9](-?[a-z0-9])*$');

export const slugValidator = () => {
  return {
    validator: (v) => {
      return v.match(slugRegexp);
    },
    message: 'Only lowercase alphanumeric characters and hyphens allowed.',
  };
};

export const isEmptyValidator = () => {
  return {
    validator: function (v: any) {
      return !isEmpty(v);
    },
    message: 'Object cannot be empty.',
  };
};

export const isArrayEmptyValidator = () => {
  return {
    validator: function (v: string[]) {
      return !isEmpty(v);
    },
    message: 'Array cannot be empty.',
  };
};

export const isArrayReferenceValidator = (model: Model<any>, pathName: string) => {
  return {
    validator: (v: string[]) => {
      return getDistinctValues(model, pathName).then((values: string[]) => {
        return v.every((k) => values.includes(k));
      });
    },
    message: 'Array contains invalid references.',
  };
};

export const hasUniqueValuesValidator = () => {
  return {
    validator: function (v: string[]) {
      const set = new Set(v);
      return set.size === v.length;
    },
    message: 'Array contains duplicate values.',
  };
};

export const requireOptionalFields = (fieldNames: string[]) => {
  return {
    validator: function (v: any) {
      const optionals = fieldNames.map((f) => get(this, f));
      if (v) {
        return optionals.every(Boolean); // check for truthy optionals;
      }
      return true;
    },
    message: `Additional optional field(s) are required: ${fieldNames.join(', ')}`,
  };
};
