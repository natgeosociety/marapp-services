import { Serializer, SerializerOptions } from 'jsonapi-serializer';

import { Layer, Widget } from '../models';

import { PaginationLinks } from './index';
import { LAYER_ATTRIBUTES } from './LayerSerializer';

export const WIDGET_ATTRIBUTES: string[] = [
  'id',
  'slug',
  'name',
  'description',
  'config',
  'published',
  'metrics',
  'organization',
  // computed;
  'createdAt',
  'updatedAt',
  'version',
  // relationships;
  'layers',
  // extra;
  '$searchHint',
];

export const createSerializer = (
  include: string[] = [],
  pagination: PaginationLinks = {},
  meta: any = {},
  opts: SerializerOptions = {}
): Serializer => {
  return new Serializer('widget', {
    attributes: WIDGET_ATTRIBUTES,
    keyForAttribute: (attribute: any) => {
      return attribute;
    },
    pluralizeType: false,
    layers: {
      included: include && include.includes('layers'),
      ref: (widget: Widget, layer: Layer) => {
        if (layer) {
          return typeof layer === 'string' ? layer : layer.id;
        }
      },
      attributes: LAYER_ATTRIBUTES,
      pluralizeType: false,
    },
    topLevelLinks: pagination,
    meta: meta,
    ...opts,
  } as any);
};
