import { Serializer, SerializerOptions } from 'jsonapi-serializer';

import { Dashboard, Layer, Widget } from '../models';

import { PaginationLinks } from './index';
import { LAYER_ATTRIBUTES } from './LayerSerializer';
import { WIDGET_ATTRIBUTES } from './WidgetSerializer';

export const DASHBOARD_ATTRIBUTES: string[] = [
  'id',
  'slug',
  'name',
  'description',
  'published',
  'organization',
  // computed;
  'createdAt',
  'updatedAt',
  'version',
  // relationships;
  'layers',
  'widgets',
];

export const createSerializer = (
  include: string[] = [],
  pagination: PaginationLinks = {},
  meta: any = {},
  opts: SerializerOptions = {}
): Serializer => {
  return new Serializer('dashboard', {
    attributes: DASHBOARD_ATTRIBUTES,
    keyForAttribute: (attribute: any) => {
      return attribute;
    },
    pluralizeType: false,
    layers: {
      included: include && include.includes('layers'),
      ref: (dashboard: Dashboard, layer: Layer) => {
        if (layer) {
          return typeof layer === 'string' ? layer : layer.id;
        }
      },
      attributes: LAYER_ATTRIBUTES,
      pluralizeType: false,
    },
    widgets: {
      included: include && include.includes('widgets'),
      ref: (dashboard: Dashboard, widget: Widget) => {
        if (widget) {
          return typeof widget === 'string' ? widget : widget.id;
        }
      },
      attributes: WIDGET_ATTRIBUTES,
      pluralizeType: false,
    },
    topLevelLinks: pagination,
    meta: meta,
    ...opts,
  } as any);
};
