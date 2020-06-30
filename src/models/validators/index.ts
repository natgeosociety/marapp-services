import { isEmpty } from 'lodash';
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
