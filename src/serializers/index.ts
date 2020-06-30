type LinkTypes = 'self' | 'next' | 'prev' | 'first' | 'last';

export type PaginationLinks = { [link in LinkTypes]?: string };
