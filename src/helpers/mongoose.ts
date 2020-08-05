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

import { boolean } from 'boolean';
import { eachDeep } from 'deepdash/standalone';
import { get, groupBy, isEmpty, isEqual, isNil, isString, merge, set } from 'lodash';
import makeError from 'make-error';
import mongoose from 'mongoose';
import { Connection, ConnectionOptions } from 'mongoose';
import qs from 'querystring';

import { DEBUG, MAX_RESULT_WINDOW } from '../config';
import { ValidationError } from '../errors';
import { getLogger } from '../logging';
import { ErrorObject, PaginationCursor } from '../types/response';

export const MongoError = makeError('ConnectionError');

export type QueryFilterOperators = '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'nin';

export type MongooseQueryFilter = { key: string; op: QueryFilterOperators; value: string | string[] };

const logger = getLogger();

type MongooseSelect = { [key: string]: 1 | 0 };
type MongooseSort = { [key: string]: 1 | -1 };
type MongooseFilter = { [key: string]: any };
type MongoosePopulate = { path: string; select: MongooseSelect; populate: MongoosePopulate; match: MongooseFilter };
type MongooseCursor = { encoded: string; decoded: PaginationCursor };

export interface QueryOptions {
  search?: MongooseFilter;
  filter?: MongooseFilter;
  populate?: MongoosePopulate[];
  select?: MongooseSelect;
  sort?: MongooseSort;
  limit?: number;
  skip?: number;
  cursor?: MongooseCursor;
}

interface ParserOptions {
  selectKey?: string;
  populateKey?: string;
  sortKey?: string;
  skipKey?: string;
  limitKey?: string;
  filterKey?: string;
  searchKey?: string;
  cursorKey?: string;
}

interface ParserContext {
  predefined?: MongooseQueryFilter[];
  includeKeyPrefix?: string; // remove prefix key from nested objects;
  excludeKeyPrefix?: string; // remove keys starting with prefix key;
}

interface QueryParserHandler {
  operator: string;
  method: Function;
  keyName: keyof ParserOptions;
  defaultKey: string;
}

/**
 * Convert query parameters from API urls to MongoDB queries (advanced querying,
 * filtering, population, sorting)
 */
export class MongooseQueryParser {
  protected result: QueryOptions = {};

  constructor(private options: ParserOptions = {}) {}

  readonly handlers: QueryParserHandler[] = [
    { operator: 'select', method: this.select, keyName: 'selectKey', defaultKey: 'select' },
    { operator: 'populate', method: this.populate, keyName: 'populateKey', defaultKey: 'include' },
    { operator: 'sort', method: this.sort, keyName: 'sortKey', defaultKey: 'sort' },
    { operator: 'skip', method: this.skip, keyName: 'skipKey', defaultKey: 'page.number' },
    { operator: 'limit', method: this.limit, keyName: 'limitKey', defaultKey: 'page.size' },
    { operator: 'cursor', method: this.cursor, keyName: 'cursorKey', defaultKey: 'page.cursor' },
    { operator: 'filter', method: this.filter, keyName: 'filterKey', defaultKey: 'filter' },
    { operator: 'search', method: this.search, keyName: 'searchKey', defaultKey: 'search' },
  ];

  /**
   * Parses a query strings to Mongoose friendly query object.
   * @param query
   * @param context
   * @param exclude
   */
  public parse(query: string | Object, context: ParserContext = {}, exclude: string[] = []): QueryOptions {
    const params = isString(query) ? qs.parse(query) : query;

    this.handlers
      .filter((handler) => !exclude.includes(handler.operator))
      .forEach(({ operator, method, keyName, defaultKey }) => {
        const key = this.options[keyName] || defaultKey;
        const value = get(params, key);

        this.result[operator] = method.call(this, value, context);
      }, this);

    this.result.populate = this.merge(this.result.populate, this.result.select, this.result.sort, this.result.filter);
    this.result.filter = this.filterWildcardKeys(this.result.filter);

    return this.result;
  }

  /**
   * Filter out keys starting with wildcards: '*'
   * @param filter
   */
  private filterWildcardKeys(filter: MongooseFilter): MongooseFilter {
    return Object.keys(filter)
      .filter((key: string) => !key.startsWith('*'))
      .reduce((obj, key) => {
        obj[key] = filter[key];
        return obj;
      }, {});
  }

  /**
   * Extract paths which should be populated with other documents.
   * Specify which document fields to include or exclude
   * @param populate
   * @param context
   */
  private populate(populate: string, context: ParserContext = {}): MongoosePopulate[] {
    const cache = {};

    const iterateLevels = (nested: string[], prevLevels: string[] = []) => {
      const topLevel = nested.shift();
      prevLevels.push(topLevel);

      let populate, path;
      const cacheKey = prevLevels.join('.');
      if (cache[cacheKey]) {
        path = cache[cacheKey];
      } else {
        path = { path: topLevel };
      }

      if (nested.length) {
        populate = iterateLevels(nested, prevLevels);
        if (populate) {
          path.populate = populate;
        }
      }
      return path;
    };

    const populations = this.queryParamGroup(populate, context).map((path) => {
      return iterateLevels(path.split('.'));
    });

    return [...new Set(populations)]; // deduplicate array;
  }

  /**
   * Specifies which document fields to include or exclude.
   * @param select
   * @param context
   */
  private select(select: string, context: ParserContext = {}) {
    if (select && select.trim()) {
      return this.parseUnaries(select, { plus: 1, minus: 0 }, context);
    }
    return {};
  }

  /**
   * Specifies a set of filters applied on document fields.
   * @param filter
   * @param context
   * @param separators
   */
  private filter(
    filter: string,
    context: ParserContext = {},
    separators: QueryFilterOperators[] = ['==', '!=', '>=', '<=', '>', '<']
  ) {
    // separate key, operators and value;
    let filters = this.queryParamGroup(filter, context).reduce((acc, value) => {
      const sanitized = value.trim();
      const regexp = new RegExp(`(.+)(${separators.join('|')})(.+)`);

      const matcher = sanitized.match(regexp);
      if (matcher && matcher.length >= 3) {
        acc.push({ key: matcher[1], op: matcher[2], value: matcher[3] });
      } else {
        const errors: ErrorObject[] = [
          {
            code: 400,
            source: { parameter: 'filter' },
            title: 'ValidationError',
            detail: `Invalid filter expression: ${filter}`,
          },
        ];
        throw new ValidationError(errors, 400);
      }
      return acc;
    }, []);

    if (context.predefined && context.predefined.length) {
      const predefined = context.predefined.filter((f) => !isNil(f.value));
      filters = filters.concat(predefined);
    }

    return filters.reduce((acc, { key, op, value }) => {
      const [operator, parsed] = this.parseFilterQueryOperators(op, value);
      set(acc, [key, operator], parsed);
      return acc;
    }, {});
  }

  /**
   * Perform text searches on collections with a text index.
   * @param query
   */
  private search(query: string) {
    if (query && query.trim()) {
      return { $text: { $search: query } };
    }
    return {};
  }

  /**
   * Sets the sort order.
   * The sort order of each path is ascending unless the path name is prefixed with -
   * which will be treated as descending.
   * @param sort
   * @param context
   */
  private sort(sort: string, context: ParserContext = {}) {
    if (sort && sort.trim()) {
      return this.parseUnaries(sort, { plus: 1, minus: -1 }, context);
    }
    return {};
  }

  /**
   * Sets the offset.
   * @param skip
   */
  private skip(skip: string): number {
    if (skip && skip.trim()) {
      return Math.max(parseInt(skip), 1);
    }
    return 1;
  }

  /**
   * Sets the limit.
   * @param limit
   */
  private limit(limit: string): number {
    if (limit && limit.trim()) {
      return Math.min(Math.max(parseInt(limit), 0), parseInt(MAX_RESULT_WINDOW));
    }
    return 100;
  }

  /**
   * Sets a cursor that provides the offset capabilities.
   * @param cursor
   */
  private cursor(cursor: string): MongooseCursor {
    const decodedCursor = decodePaginationCursor(cursor);
    if (decodedCursor && !isEmpty(decodedCursor)) {
      if (!this.validateCursor(decodedCursor)) {
        const errors: ErrorObject[] = [
          {
            code: 400,
            source: { parameter: 'cursor' },
            title: 'ValidationError',
            detail: 'Sort order cannot be changed while using cursor-based pagination.',
          },
        ];
        throw new ValidationError(errors, 400);
      }
    }
    return { encoded: cursor, decoded: decodedCursor };
  }

  /**
   * Sort order cannot change between requests while using cursor based pagination.
   * @param decodedCursor
   */
  private validateCursor(decodedCursor: PaginationCursor): boolean {
    const cursorSort = Object.entries(decodedCursor.sort).reduce((acc, [path, [value, sortOrder]]) => {
      const reverseOrder = decodedCursor.reverse ? sortOrder * -1 : sortOrder; // reverse sortOrder;
      set(acc, path, reverseOrder);
      return acc;
    }, {});
    return isEqual(cursorSort, this.result.sort);
  }

  private merge(
    populate: MongoosePopulate[],
    select: MongooseSelect = {},
    sort: MongooseSort = {},
    match: MongooseFilter = {}
  ): MongoosePopulate[] {
    function mergeDeep(
      population: MongoosePopulate[],
      collection: MongooseSelect | MongooseSort | MongooseFilter,
      savePath: string,
      prevPrefix: string = ''
    ) {
      population.forEach((row) => {
        const prefix = [prevPrefix, row.path, '.'].join('');
        Object.keys(collection).forEach((key) => {
          if (key.startsWith(prefix) || key.startsWith('*')) {
            const noPrefixKey = key.startsWith('*') ? key.replace('*.', '') : key.replace(prefix, '');
            if (!noPrefixKey.includes('.')) {
              set(row, savePath, {
                ...get(row, savePath, {}),
                [noPrefixKey]: collection[key],
              });
              if (!key.startsWith('*')) {
                delete collection[key];
              }
            }
          }
        });
        if (row.populate) {
          mergeDeep([row.populate], collection, savePath, prefix); // nested;
        }
      });
    }

    if (!isEmpty(populate) && !isEmpty(select)) {
      mergeDeep(populate, select, 'select');
    }
    if (!isEmpty(populate) && !isEmpty(sort)) {
      mergeDeep(populate, sort, 'options.sort');
    }
    if (!isEmpty(populate) && !isEmpty(match)) {
      mergeDeep(populate, match, 'match');
    }

    // group fields by population path;
    const groups = groupBy(populate, (p) => p.path);

    // merge objects with similar population path;
    return Object.values(groups).map((populateGroup) => {
      return populateGroup.reduce((acc, value) => merge(acc, value), {});
    }) as MongoosePopulate[];
  }

  /**
   * Map/reduce helper to transform list of unaries '+a,-b,c' to { a: 1, b: -1, c: 1 }
   */
  private parseUnaries = (
    queryParameter,
    mapping: { plus: number; minus: number },
    context: ParserContext = {}
  ): { [key: string]: number } => {
    return this.queryParamGroup(queryParameter, context)
      .map((unary) => unary.match(/^(\+|-)?(.*)/))
      .reduce((result, [, val, key]) => {
        result[key.trim()] = val === '-' ? mapping.minus : mapping.plus;
        return result;
      }, {});
  };

  private parseFilterQueryOperators = (
    op: string,
    value: string | string[],
    sep: string = ';'
  ): [string, string | string[]] => {
    if (op === '==') {
      // special case for multiple equalities;
      if (Array.isArray(value)) {
        return ['$in', value];
      } else if (value.split(sep).length > 1) {
        return ['$in', value.split(sep)];
      }
      return ['$eq', value];
    } else if (op === '!=') {
      // special case for multiple equalities;
      if (Array.isArray(value)) {
        return ['$nin', value];
      } else if (value.split(sep).length > 1) {
        return ['$nin', value.split(sep)];
      }
      return ['$ne', value];
    } else if (op === '>') {
      return ['$gt', value];
    } else if (op === '>=') {
      return ['$gte', value];
    } else if (op === '<') {
      return ['$lt', value];
    } else if (op === '<=') {
      return ['$lte', value];
    } else if (op === 'in') {
      if (!Array.isArray(value)) {
        return ['$in', value.split(sep)];
      }
      return ['$in', value];
    } else if (op === 'nin') {
      if (!Array.isArray(value)) {
        return ['$nin', value.split(sep)];
      }
      return ['$nin', value];
    } else if (!op) {
      return ['$exists', value];
    }
  };

  private queryParamGroup = (queryParam: string, context: ParserContext = {}, sep: string = ','): string[] => {
    if (queryParam) {
      let params = queryParam
        .split(sep)
        .filter((e: string) => !!e)
        .map((e: string) => e.trim());

      if (context.excludeKeyPrefix) {
        params = params.filter((e) => !this.filterByPrefix(context.excludeKeyPrefix, e));
      }
      if (context.includeKeyPrefix) {
        params = params
          .filter((e) => this.filterByPrefix(context.includeKeyPrefix, e))
          .map((e) => this.removePrefixKey(context.includeKeyPrefix, e));
      }
      return params;
    }
    return [];
  };

  /**
   * Filter path names by the specified prefix key.
   * @param prefixKey
   * @param key
   * @param ignorePrefixChars
   */
  private filterByPrefix = (prefixKey: string, key: string, ignorePrefixChars: string[] = ['-|+']) => {
    const regexp = `^([${ignorePrefixChars}]*)(${prefixKey})\.(.*)`;
    const matcher = key.match(regexp);
    return !!(matcher && matcher.length > 3);
  };

  /**
   * Remove prefix key from the specified path name.
   * @param prefixKey
   * @param key
   * @param ignorePrefixChars
   */
  private removePrefixKey = (prefixKey: string, key: string, ignorePrefixChars: string[] = ['-|+']) => {
    const regexp = `^([${ignorePrefixChars}]*)(${prefixKey})\.(.*)`;
    const matcher = key.match(regexp);
    if (matcher && matcher.length > 3) {
      return [matcher[1], matcher[3]].join('');
    }
    return key;
  };
}

/**
 * Opens the default MongoDB connection.
 * Options passed take precedence over options included in connection strings.
 * @returns default mongoose connection
 */
export const createMongoConnection = async (
  mongoURI: string,
  options: ConnectionOptions = {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 30000,
    bufferCommands: false,
    bufferMaxEntries: 0,
  }
): Promise<Connection> => {
  if (boolean(DEBUG)) {
    mongoose.set('debug', true);
  }

  return new Promise(async (resolve, reject) => {
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connection successful');
      resolve(mongoose.connection);
    });
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB connection disconnected');
    });
    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err}`);
    });
    try {
      logger.info('Establishing connection to MongoDB');

      // await mongoose.connect(mongoURI, options);

      return mongoose.connect(mongoURI, options).then((db) => {
        return db.connections[0];
      });
    } catch (err) {
      logger.error(err);
      throw new MongoError(`MongoDB connection error. Failed to connect to server: ${mongoURI}`);
    }
  });
};

/**
 * Generates a cursor query that provides the offset capabilities.
 * @param id
 * @param sort
 * @param last
 * @param reverseOrder
 * @param sentinel
 */
export const encodePaginationCursor = <T>(
  id: string,
  sort: { [key: string]: 1 | -1 },
  last: T,
  reverseOrder: boolean = false,
  sentinel = new Object()
): string => {
  const context: PaginationCursor = {
    id,
    sort: {},
    reverse: reverseOrder,
  };
  if (!isEmpty(sort)) {
    eachDeep(
      sort,
      (sortOrder, path) => {
        const v = get(last, path, sentinel);
        if (v !== sentinel) {
          const o = reverseOrder ? sortOrder * -1 : sortOrder; // reverse sortOrder;
          set(context.sort, path, [v, o]); // [value, sortOrder];
        } else {
          const errors: ErrorObject[] = [
            {
              code: 400,
              source: { parameter: 'sort' },
              title: 'ValidationError',
              detail: `No such property: ${path}`,
            },
          ];
          throw new ValidationError(errors, 400);
        }
      },
      { leavesOnly: true }
    );
  }
  return Buffer.from(JSON.stringify(context)).toString('base64');
};

/**
 * Decode a cursor cursor-based pagination
 * @param cursor
 * @param initialValue
 */
export const decodePaginationCursor = (cursor: string, initialValue: string = '-1'): PaginationCursor => {
  if (!cursor || !cursor.trim()) {
    return null;
  }
  const sanitize = cursor.trim();
  if (sanitize === initialValue) {
    return {}; // To retrieve cursored results, you initially pass a cursor with a value of '-1';
  }
  try {
    const decoded = Buffer.from(sanitize, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (err) {
    const errors: ErrorObject[] = [
      {
        code: 400,
        source: { parameter: 'cursor' },
        title: 'ValidationError',
        detail: 'Could not decode query parameter.',
      },
    ];
    throw new ValidationError(errors, 400);
  }
};
