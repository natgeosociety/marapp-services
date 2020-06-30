import { Serializer, SerializerOptions } from 'jsonapi-serializer';

import { Layer } from '../models';

import { PaginationLinks } from './index';

export const LAYER_ATTRIBUTES: string[] = [
  'id',
  'slug',
  'name',
  'description',
  'type',
  'provider',
  'category',
  'config',
  'organization',
  // computed;
  'published',
  'createdAt',
  'updatedAt',
  'version',
  // relationships;
  'references',
];

export const createSerializer = (
  include: string[] = [],
  pagination: PaginationLinks = {},
  meta: any = {},
  opts: SerializerOptions = {}
): Serializer => {
  return new Serializer('layer', {
    attributes: LAYER_ATTRIBUTES,
    keyForAttribute: (attribute: any) => {
      return attribute;
    },
    references: {
      included: include && include.includes('references'),
      ref: (parent: Layer, child: Layer) => {
        if (child) {
          return typeof child === 'string' ? child : child.id;
        }
      },
      attributes: LAYER_ATTRIBUTES,
    },
    pluralizeType: false,
    topLevelLinks: pagination,
    meta: meta,
    ...opts,
  } as any);
};
