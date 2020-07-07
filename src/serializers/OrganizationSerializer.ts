import { Serializer, SerializerOptions } from 'jsonapi-serializer';

import { PaginationLinks } from '.';

export const ORG_ATTRIBUTES: string[] = ['id', 'name', 'description'];

export const createSerializer = (
  include: string[] = [],
  pagination: PaginationLinks = {},
  meta: any = {},
  opts: SerializerOptions = {}
): Serializer => {
  return new Serializer('organization', {
    attributes: ORG_ATTRIBUTES,
    keyForAttribute: (attribute: any) => {
      return attribute;
    },
    pluralizeType: false,
    topLevelLinks: pagination,
    meta: meta,
    ...opts,
  } as any);
};
