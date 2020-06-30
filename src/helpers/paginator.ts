import { cloneDeep, set, unset } from 'lodash';
import queryStringEncode from 'query-string-encode';

import { PaginationLinks } from '../serializers';

/**
 * Pagination Helper.
 */
export class PaginationHelper {
  readonly sizeTotal: number;
  readonly currentPage: number;
  readonly pageSize: number;
  readonly nextCursor: string;
  readonly currentCursor: string;
  readonly previousCursor: string;

  constructor(context: {
    sizeTotal: number;
    pageSize: number;
    currentPage?: number;
    nextCursor?: string;
    currentCursor?: string;
    previousCursor?: string;
  }) {
    this.sizeTotal = context.sizeTotal;
    this.currentPage = context.currentPage;
    this.pageSize = context.pageSize;
    this.nextCursor = context.nextCursor;
    this.currentCursor = context.currentCursor;
    this.previousCursor = context.previousCursor;
  }

  public getCurrentPage(): number {
    return Math.min(this.currentPage, this.getPageCount());
  }

  public getFirstPage(): number {
    return this.getPageCount() >= 1 ? 1 : null;
  }

  public getLastPage(): number {
    return this.getPageCount();
  }

  public getNextPage(): number {
    const hasNext = this.currentPage * this.pageSize < this.sizeTotal;
    return hasNext ? this.currentPage + 1 : null;
  }

  public getPreviousPage(): number {
    const hasPrev = this.currentPage > 1;
    return hasPrev ? this.currentPage - 1 : null;
  }

  public getPageCount(): number {
    return Math.ceil(this.sizeTotal / this.pageSize);
  }

  private hasNextCursor(): boolean {
    return !!this.nextCursor;
  }

  private hasPreviousCursor(): boolean {
    return !!this.previousCursor;
  }

  public getPaginationLinks(baseUrl: string, query: { [key: string]: any }): PaginationLinks {
    const pagination: PaginationLinks = {
      self: null,
      next: null,
      prev: null,
      first: null,
      last: null,
    };
    const clone = cloneDeep(query);
    set(clone, 'page.size', this.pageSize);

    if (this.hasNextCursor()) {
      const self = cloneDeep(clone);
      set(self, 'page.cursor', this.currentCursor);
      unset(self, 'page.number');
      pagination.self = this.encodeQueryToURL(baseUrl, self);
    } else if (this.getCurrentPage() !== null) {
      const self = cloneDeep(clone);
      set(self, 'page.number', this.currentPage);
      pagination.self = this.encodeQueryToURL(baseUrl, self);
    }

    if (this.hasNextCursor()) {
      const next = cloneDeep(clone);
      set(next, 'page.cursor', this.nextCursor);
      unset(next, 'page.number');
      pagination.next = this.encodeQueryToURL(baseUrl, next);
    } else if (this.getNextPage() !== null) {
      const next = cloneDeep(clone);
      set(next, 'page.number', this.getNextPage());
      pagination.next = this.encodeQueryToURL(baseUrl, next);
    }

    if (this.hasPreviousCursor()) {
      const prev = cloneDeep(clone);
      set(prev, 'page.cursor', this.previousCursor);
      unset(prev, 'page.number');
      pagination.prev = this.encodeQueryToURL(baseUrl, prev);
    } else if (this.getPreviousPage() !== null) {
      const prev = cloneDeep(clone);
      set(prev, 'page.number', this.getPreviousPage());
      pagination.prev = this.encodeQueryToURL(baseUrl, prev);
    }

    if (this.hasNextCursor()) {
    } else if (this.getFirstPage() !== null) {
      const first = cloneDeep(clone);
      set(first, 'page.number', this.getFirstPage());
      pagination.first = this.encodeQueryToURL(baseUrl, first);
    }

    if (this.hasNextCursor()) {
    } else if (this.getLastPage() !== null) {
      const last = cloneDeep(clone);
      set(last, 'page.number', this.getLastPage());
      pagination.last = this.encodeQueryToURL(baseUrl, last);
    }

    return pagination;
  }

  public encodeQueryToURL(baseUrl: string, query: { [key: string]: any }): string {
    return [baseUrl, decodeURIComponent(queryStringEncode(query))].join('?');
  }
}
