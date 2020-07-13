import { Serializer, SerializerOptions } from 'jsonapi-serializer';

import { Collection, Location, Metric } from '../models';

import { PaginationLinks } from './index';
import { LOCATION_ATTRIBUTES } from './LocationSerializer';
import { METRIC_ATTRIBUTES } from './MetricSerializer';

export const COLLECTION_ATTRIBUTES: string[] = [
  'id',
  'slug',
  'name',
  'description',
  'published',
  'featured',
  'organization',
  // computed;
  'geojson',
  'bbox2d',
  'areaKm2',
  'centroid',
  'createdAt',
  'updatedAt',
  'version',
  // relationships;
  'locations',
  'metrics',
  // extra;
  '$searchHint',
];

export const createSerializer = (
  include: string[] = [],
  pagination: PaginationLinks = {},
  meta: any = {},
  opts: SerializerOptions = {}
): Serializer => {
  return new Serializer('collection', {
    attributes: COLLECTION_ATTRIBUTES,
    keyForAttribute: (attribute: any) => {
      return attribute;
    },
    locations: {
      included: include && include.includes('locations'),
      ref: (parent: Collection, location: Location) => {
        if (location) {
          return typeof location === 'string' ? location : location.id;
        }
      },
      attributes: LOCATION_ATTRIBUTES,
      pluralizeType: false,
    },
    metrics: {
      included: include && include.includes('metrics'),
      ref: (parent: Collection, metric: Metric) => {
        if (metric) {
          return typeof metric === 'string' ? metric : metric.id;
        }
      },
      attributes: METRIC_ATTRIBUTES,
      pluralizeType: false,
    },
    pluralizeType: false,
    topLevelLinks: pagination,
    meta: meta,
    ...opts,
  } as any);
};
