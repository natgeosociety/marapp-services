import { Serializer, SerializerOptions } from 'jsonapi-serializer';

import { PaginationLinks } from './index';

export const GROUP_ATTRIBUTES: string[] = ['id', 'name', 'description', 'roles'];
export const ROLE_ATTRIBUTES: string[] = ['id', 'name', 'description'];

export const createSerializer = (
  include: string[] = [],
  pagination: PaginationLinks = {},
  meta: any = {},
  opts: SerializerOptions = {}
): Serializer => {
  return new Serializer('group', {
    attributes: GROUP_ATTRIBUTES,
    keyForAttribute: (attribute: any) => {
      return attribute;
    },
    pluralizeType: false,
    roles: {
      included: include && include.includes('roles'),
      ref: (user: any, role: any) => {
        if (role) {
          return typeof role === 'string' ? role : role.id;
        }
      },
      attributes: ROLE_ATTRIBUTES,
      pluralizeType: false,
    },
    topLevelLinks: pagination,
    meta: meta,
    ...opts,
  } as any);
};
