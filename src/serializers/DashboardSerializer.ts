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
  // extra;
  '$searchHint',
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
