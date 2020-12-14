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

import { eachDeep } from 'deepdash/standalone';
import { get, isEmpty, isFunction, isNil, omit, orderBy, set } from 'lodash';
import { Document, Model, Query } from 'mongoose';
import { Readable } from 'stream';

import { DocumentError, ExposedError, RecordNotFound, ValidationError } from '../../errors';
import { encodePaginationCursor, QueryOptions } from '../../helpers/mongoose';
import { forEachAsync } from '../../helpers/util';
import { getLogger } from '../../logging';
import { geojsonToGeometryCollection } from '../../services/geospatial';
import { ErrorObject } from '../../types/response';

const logger = getLogger('models');

type AggCount = { key: string; value: string; count: number };

/**
 * Save a document.
 * @param model
 * @param data
 * @param mongooseOptions
 * @param uniqueIndexFields
 * @param omitPaths
 * @param raiseError
 */
export const save = async <T extends Document, L extends keyof T>(
  model: Model<T>,
  data: T,
  mongooseOptions: QueryOptions = {},
  uniqueIndexFields: L[] = [],
  omitPaths: string[] = ['id', 'createdAt', 'updatedAt'],
  raiseError: boolean = true
): Promise<T> => {
  const obj = omit(data, omitPaths);
  const doc = new model(obj);
  try {
    await doc.save();
    return getById(model, doc.id, mongooseOptions, uniqueIndexFields);
  } catch (err) {
    logger.error(err);
    if (raiseError) {
      if (err instanceof ExposedError) {
        throw err;
      }
      if (err.name === 'MongoError' && err.code === 11000) {
        throw new DocumentError('Could not save document. Duplicate key error.', 400);
      }
      if (err.name === 'ValidationError') {
        const errors: ErrorObject[] = Object.values(err.errors).map((e: any) => ({
          code: 400,
          source: { pointer: '/data/attributes/' + e.path },
          title: e.name,
          detail: e.message,
        }));
        throw new ValidationError(errors, 400);
      }
      throw new DocumentError('Could not save document.', 500);
    }
  }
  return doc;
};

/**
 * Get a document by ID or unique index fields.
 * A unique index ensures that the indexed fields do not store duplicate values.
 * By default, MongoDB creates a unique index on the _id.
 * @param model
 * @param id
 * @param mongooseOptions
 * @param uniqueIndexFields
 * @param raiseError
 */
export const getById = async <T extends Document, L extends keyof T>(
  model: Model<T>,
  id: string,
  mongooseOptions: QueryOptions = {},
  uniqueIndexFields: L[] = [],
  raiseError: boolean = true
): Promise<T> => {
  const cond: any = { $or: [{ _id: id }] }; // default unique index _id;
  uniqueIndexFields.forEach((uniqueIndex) => {
    cond.$or.push({ [uniqueIndex]: id });
  });

  let query: Query<T> = model
    .findOne({ ...mongooseOptions.filter, ...cond })
    .select(mongooseOptions.select)
    .populate(mongooseOptions.populate);

  let doc: T = null;
  try {
    doc = await query.exec();
  } catch (err) {
    logger.error(err);
    if (raiseError) {
      if (err instanceof ExposedError) {
        throw err;
      }
      if (err.name === 'MongoError' && err.code === 2) {
        throw new DocumentError('Could not retrieve document. Cannot have a mix of inclusion and exclusion.', 400);
      }
      throw new DocumentError('Could not retrieve document.', 500);
    }
  }
  return doc;
};

/**
 * Lightweight check if a document exists in the database.
 * Returns the document id in case of a match.
 * @param model
 * @param id
 * @param mongooseOptions
 * @param uniqueIndexFields
 * @param raiseError
 */
export const exists = async <T extends Document, L extends keyof T>(
  model: Model<T>,
  id: string,
  mongooseOptions: QueryOptions = {},
  uniqueIndexFields: L[] = [],
  raiseError: boolean = true
): Promise<string> => {
  const cond: any = { $or: [{ _id: id }] }; // default unique index _id;
  uniqueIndexFields.forEach((uniqueIndex) => {
    cond.$or.push({ [uniqueIndex]: id });
  });

  let query: Query<T> = model
    .findOne({ ...mongooseOptions.filter, ...cond })
    .select('_id')
    .lean();

  try {
    const doc: T = await query.exec();
    if (doc) {
      return doc._id;
    }
  } catch (err) {
    logger.error(err);
    if (raiseError) {
      if (err instanceof ExposedError) {
        throw err;
      }
      throw new DocumentError('Could not retrieve document.', 500);
    }
  }
};

/**
 * Get first record given the sort fields.
 * Useful when you need to return the most recent document given a specific sorting.
 * @param model
 * @param id
 * @param mongooseOptions
 * @param uniqueIndexFields
 * @param sortField
 * @param raiseError
 */
export const getOne = async <T extends Document, L extends keyof T, K extends keyof T>(
  model: Model<T>,
  id: string,
  mongooseOptions: QueryOptions = {},
  uniqueIndexFields: L[] = [],
  sortField: { [Key in K]?: 1 | -1 },
  raiseError: boolean = true
): Promise<T> => {
  const cond: any = { $or: [{ _id: id }] }; // default unique index _id;
  uniqueIndexFields.forEach((uniqueIndex) => {
    cond.$or.push({ [uniqueIndex]: id });
  });

  let query: Query<T> = model
    .findOne({ ...mongooseOptions.filter, ...cond })
    .select(mongooseOptions.select)
    .populate(mongooseOptions.populate)
    .sort(sortField);

  let doc: T = null;
  try {
    doc = await query.exec();
  } catch (err) {
    logger.error(err);
    if (raiseError) {
      if (err instanceof ExposedError) {
        throw err;
      }
      if (err.name === 'MongoError' && err.code === 2) {
        throw new DocumentError('Could not retrieve document. Cannot have a mix of inclusion and exclusion.', 400);
      }
      throw new DocumentError('Could not retrieve document.', 500);
    }
  }
  return doc;
};

/**
 * Update a document by ID.
 * @param model
 * @param doc
 * @param data
 * @param mongooseOptions
 * @param uniqueIndexFields
 * @param omitPaths
 * @param raiseError
 */
export const update = async <T extends Document, L extends keyof T>(
  model: Model<T>,
  doc: T,
  data: T,
  mongooseOptions: QueryOptions = {},
  uniqueIndexFields: L[] = [],
  omitPaths: string[] = ['id', 'createdAt', 'updatedAt'],
  raiseError: boolean = true
): Promise<T> => {
  const obj = omit(data, omitPaths);
  for (let [key, value] of Object.entries(obj)) {
    (doc as any)[key] = value;
  }
  try {
    await doc.save();
    return getById(model, doc.id, mongooseOptions, uniqueIndexFields);
  } catch (err) {
    logger.error(err);
    if (raiseError) {
      if (err instanceof ExposedError) {
        throw err;
      }
      if (err.name === 'MongoError' && err.code === 11000) {
        throw new DocumentError('Could not update document. Duplicate key error.', 400);
      }
      if (err.name === 'ValidationError') {
        const errors: ErrorObject[] = Object.values(err.errors).map((e: any) => ({
          code: 400,
          source: { pointer: '/data/attributes/' + e.path },
          title: e.name,
          detail: e.message,
        }));
        throw new ValidationError(errors, 400);
      }
      throw new DocumentError('Could not update document.', 500);
    }
  }
  return doc;
};

/**
 * Get multiple documents by ID.
 * @param model
 * @param ids
 * @param mongooseOptions
 * @param raiseError
 */
export const getByIds = async <T extends Document, L extends keyof T>(
  model: Model<T>,
  ids: string[],
  mongooseOptions: QueryOptions = {},
  raiseError: boolean = true
): Promise<T[]> => {
  // @ts-ignore
  let query: Query<T[]> = model.find({ _id: { $in: ids }, ...mongooseOptions.filter });

  query = query.select(mongooseOptions.select).populate(mongooseOptions.populate).sort(mongooseOptions.sort);

  let docs: T[] = [];
  try {
    docs = await query.exec();
  } catch (err) {
    logger.error(err);
    if (raiseError) {
      if (err instanceof ExposedError) {
        throw err;
      }
      if (err.name === 'MongoError' && err.code === 2) {
        throw new DocumentError('Could not retrieve documents. Cannot have a mix of inclusion and exclusion.', 400);
      }
      throw new DocumentError('Could not retrieve documents.', 500);
    }
  }
  return docs;
};

/**
 * Get "ES like" aggregation based on query & field
 * @param model
 * @param query
 * @param field
 */
export const aggregateCount = async <T extends Document, L extends keyof T>(
  model: Model<T>,
  query: object,
  field: string
): Promise<AggCount[]> => {
  const response = await model
    .aggregate([
      // filter docs to match the specified condition(s);
      { $match: omit(query, [field]) },
      // pass docs to next stage in the pipeline;
      { $project: { [field]: true } },
      // deconstructs an array field to output a document for each element;
      { $unwind: '$' + field },
      // group by the specified _id expression and output a document for each distinct grouping;
      { $group: { _id: '$' + field, count: { $sum: 1 } } },
    ])
    .exec();

  const options = get(model.schema.path(field), 'options.enum', []);
  const optionsResolver = get(model, 'enumOptionsResolver');

  // dynamic enum options resolver;
  if (optionsResolver && isFunction(optionsResolver)) {
    const fieldResolverFn = get(optionsResolver(), field);
    if (fieldResolverFn && isFunction(fieldResolverFn)) {
      const distinct = await fieldResolverFn();
      options.push(...distinct);
    }
  }

  if (options && options.length) {
    // add the missing values with count 0;
    const nulls = options
      .filter((v: string) => !response.find((item) => item._id === v))
      .map((v: string) => ({ _id: v, count: 0 }));
    response.push(...nulls);
  }

  const countAgg: AggCount[] = response.map((e) => ({ key: field, value: e._id, count: e.count })); // "ES like"
  return orderBy(countAgg, ['value'], ['asc']);
};

/**
 * Get all documents for the specified model.
 * @param model
 * @param mongooseOptions
 * @param filterIds
 * @param aggregateFields
 * @param raiseError
 */
export const getAll = async <T extends Document, L extends keyof T>(
  model: Model<T>,
  mongooseOptions: QueryOptions = {},
  filterIds: string[] = null,
  aggregateFields: L[] = [],
  raiseError: boolean = true
): Promise<{ docs: T[]; total: number; cursor: { next: string; previous: string }; aggs: AggCount[] }> => {
  let { queryCond, sortCond } = encodeCursorQuery(mongooseOptions);
  const paginationCursor = mongooseOptions.cursor.decoded;

  if (!isNil(filterIds)) {
    queryCond = { ...queryCond, _id: { $in: filterIds } }; // filter by ids;
  }

  let query: Query<T[]> = model
    // @ts-ignore
    .find(queryCond)
    .select(mongooseOptions.select)
    .populate(mongooseOptions.populate)
    .sort(sortCond);

  // default to "offset-based" paging;
  if (isEmpty(paginationCursor)) {
    const skipNo = (mongooseOptions.skip - 1) * mongooseOptions.limit;
    query = query.skip(skipNo);
  }
  query = query.limit(mongooseOptions.limit);

  let total: number;
  let docs: T[] = [];
  let aggs: AggCount[] = [];

  let nextCursor: string;
  let previousCursor: string;
  try {
    docs = await query.exec();
    if (paginationCursor && paginationCursor.reverse) {
      docs = docs.reverse(); // reverse sort order;
    }

    // clone the query without pagination;
    const countQuery = query.find().merge(query).skip(null).limit(null);

    total = await countQuery.countDocuments();

    // create a cursor based on the last record;
    if (paginationCursor !== null && docs.length && total > mongooseOptions.limit) {
      const [first, last] = [docs[0], docs[docs.length - 1]];
      nextCursor = encodePaginationCursor<T>(last._id, mongooseOptions.sort, last);

      if (!isEmpty(paginationCursor) && total > mongooseOptions.limit) {
        previousCursor = encodePaginationCursor<T>(first._id, mongooseOptions.sort, first, true);
      }
    }
  } catch (err) {
    logger.error(err);
    if (raiseError) {
      if (err instanceof ExposedError) {
        throw err;
      }
      if (err.name === 'MongoError' && err.code === 2) {
        throw new DocumentError('Could not retrieve documents. Cannot have a mix of inclusion and exclusion.', 400);
      }
      throw new DocumentError('Could not retrieve documents.', 500);
    }
  }

  // keep sort order based on filter ids;
  if (filterIds && filterIds.length > 0) {
    const docIds = docs.reduce((acc, c) => (acc[c._id] = c) && acc, {});
    docs = filterIds.map((id) => docIds[id]).filter(Boolean);
  }

  // aggregations based on specified fields;
  if (aggregateFields.length > 0) {
    const arrays = await forEachAsync(aggregateFields, async (f) => aggregateCount(model, query.getQuery(), f));
    aggs = [].concat.apply([], arrays);
  }

  return {
    docs,
    total,
    aggs,
    cursor: { next: nextCursor, previous: previousCursor },
  };
};

/**
 * Get all documents as a stream for the specified model.
 * @param model
 * @param mongooseOptions
 * @param filterIds
 * @param raiseError
 */
export const getAllStream = async <T extends Document, L extends keyof T>(
  model: Model<T>,
  mongooseOptions: QueryOptions = {},
  filterIds: string[] = null,
  raiseError: boolean = true
): Promise<Readable> => {
  let queryCond: { [key: string]: any } = {
    ...mongooseOptions.search,
    ...mongooseOptions.filter,
  };
  let sortCond: { [key: string]: number } = {
    ...mongooseOptions.sort,
    _id: 1, // default sorting;
  };

  let query: Query<T[]> = model
    // @ts-ignore
    .find(queryCond)
    .select(mongooseOptions.select)
    .populate(mongooseOptions.populate)
    .sort(sortCond);

  try {
    const cursor = query.cursor();
    return cursor;
  } catch (err) {
    logger.error(err);
    if (raiseError) {
      if (err instanceof ExposedError) {
        throw err;
      }
      if (err.name === 'MongoError' && err.code === 2) {
        throw new DocumentError('Could not retrieve documents. Cannot have a mix of inclusion and exclusion.', 400);
      }
      throw new DocumentError('Could not retrieve documents.', 500);
    }
  }
};

/**
 * Remove a document.
 * @param model
 * @param doc
 * @param raiseError
 */
export const remove = async <T extends Document, L extends keyof T>(
  model: Model<T>,
  doc: T,
  raiseError: boolean = true
): Promise<boolean> => {
  let success: boolean = true;
  try {
    await doc.remove();
  } catch (err) {
    logger.error(err);
    if (raiseError) {
      if (err instanceof ExposedError) {
        throw err;
      }
      throw new DocumentError('Could not remove document.', 500);
    }
    success = false;
  }
  return success;
};

/**
 * Remove a document by ID.
 * @param model
 * @param id
 * @param uniqueIndexFields
 * @param raiseError
 */
export const removeById = async <T extends Document, L extends keyof T>(
  model: Model<T>,
  id: string,
  uniqueIndexFields: L[] = [],
  raiseError: boolean = true
): Promise<boolean> => {
  let success: boolean = true;
  const doc = await getById(model, id, {}, uniqueIndexFields);
  if (!doc) {
    throw new RecordNotFound(`Could not retrieve document.`, 404);
  }
  try {
    await doc.remove();
  } catch (err) {
    logger.error(err);
    if (raiseError) {
      if (err instanceof ExposedError) {
        throw err;
      }
      throw new DocumentError('Could not remove document.', 500);
    }
    success = false;
  }
  return success;
};

/**
 * Remove documents by query.
 * Deletes every document that matches filter in the collection.
 * @param model
 * @param queryCond
 * @param raiseError
 */
export const removeByQuery = async <T extends Document, L extends keyof T>(
  model: Model<T>,
  queryCond: { [key in L]?: any } = {},
  raiseError: boolean = true
): Promise<boolean> => {
  if (isEmpty(queryCond)) {
    return false;
  }
  let success: boolean = true;
  try {
    const res = await model.deleteMany(<any>queryCond);
    logger.debug('successfully removed %s documents.', res.deletedCount);
  } catch (err) {
    logger.error(err);
    if (raiseError) {
      if (err instanceof ExposedError) {
        throw err;
      }
      throw new DocumentError('Could not remove documents.', 500);
    }
    success = false;
  }
  return success;
};

/**
 * Remove multiple documents by IDs.
 * @param model
 * @param ids
 * @param raiseError
 */
export const removeByIds = async <T extends Document>(
  model: Model<T>,
  ids: string[],
  raiseError: boolean = true
): Promise<boolean> => {
  let success: boolean = true;
  try {
    // @ts-ignore
    await model.deleteMany({ _id: { $in: ids } });
  } catch (err) {
    logger.error(err);
    if (raiseError) {
      if (err instanceof ExposedError) {
        throw err;
      }
      throw new DocumentError('Could not remove documents.', 500);
    }
    success = false;
  }
  return success;
};

/**
 * Counts number of matching documents in a database collection.
 * @param model
 * @param queryCond
 * @param estimatedCount
 * @param raiseError
 */
export const countByQuery = async <T extends Document, L extends keyof T>(
  model: Model<T>,
  queryCond: { [key in L]?: any } = {},
  estimatedCount: boolean = false,
  raiseError: boolean = true
): Promise<number> => {
  let countQuery: Query<number>;
  if (estimatedCount) {
    // estimates the number of documents in a MongoDB collection,
    // uses collection metadata rather than scanning the entire collection.
    countQuery = model.estimatedDocumentCount(queryCond);
  } else {
    countQuery = model.countDocuments(<any>queryCond);
  }

  let count: number = 0;
  try {
    count = await countQuery.exec();
  } catch (err) {
    logger.error(err);
    if (raiseError) {
      if (err instanceof ExposedError) {
        throw err;
      }
      throw new DocumentError('Could not count documents.', 500);
    }
  }
  return count;
};

/**
 * Return all documents that intersect the given geometry.
 * $geometry uses EPSG:4326 as the default coordinate reference system (CRS).
 *
 * @param model
 * @param geojson
 * @param excludeIds
 * @param mongooseOptions
 * @param geometryPath
 * @param raiseError
 */
export const getByGeometryIntersection = async <T extends Document, L extends keyof T>(
  model: Model<T>,
  geojson: {},
  excludeIds: string[] = [],
  mongooseOptions: QueryOptions = {},
  geometryPath: string = 'geojson.features.geometry',
  raiseError: boolean = true
): Promise<string[]> => {
  if (isEmpty(geojson)) {
    throw new DocumentError('GeoJSON required to compute geometry intersections.', 500);
  }
  const geometryCollection = geojsonToGeometryCollection(<any>geojson);

  // @ts-ignore
  let query: Query<T[]> = model.find({
    [geometryPath]: {
      $geoIntersects: {
        $geometry: geometryCollection,
      },
    },
    _id: { $nin: excludeIds },
    ...mongooseOptions.filter,
  });

  let docs: string[] = [];
  try {
    docs = await query.distinct('_id');
  } catch (err) {
    logger.error(err);
    if (raiseError) {
      if (err instanceof ExposedError) {
        throw err;
      }
      throw new DocumentError('Could not retrieve geometry intersections.', 500);
    }
  }
  return docs;
};

/**
 * Return all the distinct values for the given pathName.
 * @param model
 * @param pathName
 * @param raiseError
 */
export const getDistinctValues = async <T extends Document>(
  model: Model<T>,
  pathName: string,
  raiseError: boolean = true
): Promise<string[]> => {
  let distinct: string[] = [];
  try {
    distinct = await model.find().distinct(pathName);
  } catch (err) {
    logger.error(err);
    if (raiseError) {
      if (err instanceof ExposedError) {
        throw err;
      }
      throw new DocumentError('Could not retrieve distinct values.', 500);
    }
  }
  return distinct;
};

/**
 * Generates a cursor query `$find` that provides the offset capabilities.
 * Generates a `$sort` object given the parameters.
 * @param mongooseOptions
 */
const encodeCursorQuery = (
  mongooseOptions: QueryOptions
): { queryCond: { [key: string]: any }; sortCond: { [key: string]: any } } => {
  let queryCond: { [key: string]: any } = {
    ...mongooseOptions.search,
    ...mongooseOptions.filter,
  };
  let sortCond: { [key: string]: number } = {
    ...mongooseOptions.sort,
    _id: 1, // default sorting;
  };
  const paginationCursor = mongooseOptions.cursor.decoded;

  if (!isEmpty(paginationCursor)) {
    logger.debug(`received cursor: ${JSON.stringify(paginationCursor)}`);

    const sortQuery = Object.entries(paginationCursor.sort).reduce(
      // @ts-ignore
      (acc, [path, [value, sortOrder]]) => {
        const comparisonOp = sortOrder > 0 ? '$gt' : '$lt';

        const tmp = {};
        const deep = [path, comparisonOp].join('.');

        if (acc.$or.length) {
          const element = acc.$or[acc.$or.length - 1];
          eachDeep(
            element,
            (value, key, parent, { path }) => {
              const safe = path
                .split('.')
                .filter((e) => !['$gt', '$lt'].includes(e))
                .join('.');
              set(tmp, safe, value);
            },
            { leavesOnly: true }
          );
        }
        set(tmp, deep, value);
        acc.$or.push(tmp);

        return acc;
      },
      { $or: [] }
    );

    const comparisonOp = paginationCursor.reverse ? '$lt' : '$gt';
    const tmp = {
      _id: { [comparisonOp]: paginationCursor.id },
    };

    if (sortQuery.$or.length) {
      const element = sortQuery.$or[sortQuery.$or.length - 1];
      eachDeep(
        element,
        (value, key, parent, { path }) => {
          const safe = path
            .split('.')
            .filter((e) => !['$gt', '$lt'].includes(e))
            .join('.');
          set(tmp, safe, value);
        },
        { leavesOnly: true }
      );
    }
    sortQuery.$or.push(tmp);

    queryCond = { ...queryCond, ...sortQuery };

    if (paginationCursor.reverse) {
      const sortTemp = {};
      eachDeep(
        sortCond,
        (sortOrder, path) => {
          const reverseOrder = sortOrder * -1; // reverse sortOrder;
          set(sortTemp, path, reverseOrder);
        },
        { leavesOnly: true }
      );
      sortCond = sortTemp;
    }
  }
  return { queryCond, sortCond };
};
