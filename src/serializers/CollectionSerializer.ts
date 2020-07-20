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
