import { Serializer, SerializerOptions } from 'jsonapi-serializer';

import { Location, Metric } from '../models';

import { PaginationLinks } from './index';
import { LOCATION_ATTRIBUTES } from './LocationSerializer';

export const METRIC_ATTRIBUTES: string[] = [
  'id',
  'slug',
  'metric',
  // computed;
  'createdAt',
  'updatedAt',
  'version',
  // relationships;
  'location',
];

export const createSerializer = (
  include: string[] = [],
  pagination: PaginationLinks = {},
  meta: any = {},
  opts: SerializerOptions = {}
): Serializer => {
  return new Serializer('metric', {
    attributes: METRIC_ATTRIBUTES,
    keyForAttribute: (attribute: any) => {
      return attribute;
    },
    location: {
      included: include && include.includes('location'),
      ref: (metric: Metric, loc: Location) => {
        if (loc) {
          return typeof loc === 'string' ? loc : loc.id;
        }
      },
      attributes: LOCATION_ATTRIBUTES,
    },
    topLevelLinks: pagination,
    meta: meta,
    ...opts,
  } as any);
};
