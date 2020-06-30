import { Serializer, SerializerOptions } from 'jsonapi-serializer';

import { PaginationLinks } from '.';

export const USER_ATTRIBUTES: string[] = ['id', 'email', 'name', 'groups'];
export const GROUP_ATTRIBUTES: string[] = ['id', 'name', 'description', 'roles'];
export const ROLE_ATTRIBUTES: string[] = ['id', 'name', 'description'];

export const createSerializer = (
  include: string[] = [],
  pagination: PaginationLinks = {},
  meta: any = {},
  opts: SerializerOptions = {}
): Serializer => {
  return new Serializer('user', {
    attributes: USER_ATTRIBUTES,
    keyForAttribute: (attribute: any) => {
      return attribute;
    },
    pluralizeType: false,
    groups: {
      included: include && include.includes('groups'),
      ref: (user: any, group: any) => {
        if (group) {
          return typeof group === 'string' ? group : group.id;
        }
      },
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
      attributes: GROUP_ATTRIBUTES,
      pluralizeType: false,
    },
    topLevelLinks: pagination,
    meta: meta,
    ...opts,
  } as any);
};
