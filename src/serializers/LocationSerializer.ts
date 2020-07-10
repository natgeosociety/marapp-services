import { Serializer, SerializerOptions } from 'jsonapi-serializer';

import { Location, Metric } from '../models';

import { PaginationLinks } from './index';
import { METRIC_ATTRIBUTES } from './MetricSerializer';

export const LOCATION_ATTRIBUTES: string[] = [
  'id',
  'slug',
  'name',
  'description',
  'type',
  'geojson',
  'published',
  'featured',
  'organization',
  // computed;
  'bbox2d',
  'areaKm2',
  'centroid',
  'createdAt',
  'updatedAt',
  'version',
  // relationships;
  'intersections',
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
  return new Serializer('location', {
    attributes: LOCATION_ATTRIBUTES,
    keyForAttribute: (attribute: any) => {
      return attribute;
    },
    pluralizeType: false,
    metrics: {
      included: include && include.includes('metrics'),
      ref: (loc: Location, metric: Metric) => {
        if (metric) {
          return typeof metric === 'string' ? metric : metric.id;
        }
      },
      attributes: METRIC_ATTRIBUTES,
      pluralizeType: false,
    },
    intersections: {
      included: include && include.includes('intersections'),
      ref: (loc: Location, intersection: Location) => {
        if (intersection) {
          return typeof intersection === 'string' ? intersection : intersection.id;
        }
      },
      attributes: LOCATION_ATTRIBUTES,
      pluralizeType: false,
    },
    topLevelLinks: pagination,
    meta: meta,
    ...opts,
  } as any);
};
