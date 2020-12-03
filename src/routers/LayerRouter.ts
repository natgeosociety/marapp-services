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

import { Response, Router } from 'express';
import asyncHandler from 'express-async-handler';
import { body, param, query } from 'express-validator';
import { merge } from 'lodash';
import urljoin from 'url-join';

import { DEFAULT_CONTENT_TYPE } from '../config';
import { RecordNotFound } from '../errors';
import { MongooseQueryFilter, MongooseQueryParser } from '../helpers/mongoose';
import { PaginationHelper } from '../helpers/paginator';
import { getLogger } from '../logging';
import { AuthzGuards, AuthzRequest, guard } from '../middlewares/authz-guards';
import { LayerModel } from '../models';
import { getAll, getById, remove, save, update } from '../models/utils';
import { createSerializer } from '../serializers/LayerSerializer';
import { createSerializer as createSlugSerializer } from '../serializers/SlugSerializer';
import { createSerializer as createStatusSerializer } from '../serializers/StatusSerializer';
import { removeMapTiles } from '../services/storage-service';
import { ResponseMeta } from '../types/response';

import { queryParamGroup, validate } from '.';

const logger = getLogger();

const getRouter = (basePath: string = '/', routePath: string = '/layers') => {
  const router: Router = Router();
  const path = urljoin(basePath, routePath);

  const queryFilters: MongooseQueryFilter[] = [
    { key: 'published', op: '==', value: true },
    { key: '*.published', op: '==', value: true },
  ];
  const parser = new MongooseQueryParser();

  router.get(
    path,
    validate([
      query('search').optional().isString().trim(),
      query('filter').optional().isString().trim(),
      query('include').optional().isString().trim(),
      query('select').optional().isString().trim(),
      query('sort').optional().isString().trim(),
      query('page[number]').optional().isInt({ min: 0 }),
      query('page[size]').optional().isInt({ min: 0 }),
      query('page[cursor]').optional().isString().trim(),
      query('group').optional().isString().trim(),
    ]),
    guard.enforcePrimaryGroup(false, true),
    AuthzGuards.readLayersGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const search = <string>req.query.search;
      const include = queryParamGroup(<string>req.query.include);

      const predefined = queryFilters.concat([{ key: 'organization', op: 'in', value: req.groups }]);
      const queryOptions = parser.parse(req.query, { predefined }, ['search']);

      const searchResult = await LayerModel.esSearchOnlyIds(search, { organization: req.groups, published: true });
      const searchIds = search ? Object.keys(searchResult) : null;

      const { docs, total, cursor, aggs } = await getAll(LayerModel, queryOptions, searchIds, ['category']);

      const paginator = new PaginationHelper({
        sizeTotal: total,
        pageSize: queryOptions.limit,
        currentPage: queryOptions.skip,
        currentCursor: queryOptions.cursor.encoded,
        nextCursor: cursor.next,
        previousCursor: cursor.previous,
      });
      const paginationLinks = paginator.getPaginationLinks(req.path, req.query);

      const meta: ResponseMeta = {
        results: total,
        pagination: {
          total: paginator.getPageCount(),
          size: queryOptions.limit,
        },
        filters: aggs,
      };
      if (queryOptions.cursor.decoded) {
        meta.pagination = merge(meta.pagination, { nextCursor: cursor.next, previousCursor: cursor.previous });
      } else {
        meta.pagination = merge(meta.pagination, { page: queryOptions.skip });
      }

      const searchedDocs = docs.map((doc) => ({
        ...doc.toObject(),
        $searchHint: searchResult[doc.id] || {},
      }));

      const code = 200;
      const response = createSerializer(include, paginationLinks, meta).serialize(searchedDocs);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.get(
    `${path}/:id`,
    validate([
      param('id').isString(),
      query('include').optional().isString().trim(),
      query('select').optional().isString().trim(),
      query('sort').optional().isString().trim(),
      query('group').optional().isString().trim(),
    ]),
    guard.enforcePrimaryGroup(false, true),
    AuthzGuards.readLayersGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const id = req.params.id;
      const include = queryParamGroup(<string>req.query.include);

      const predefined = queryFilters.concat([{ key: 'organization', op: 'in', value: req.groups }]);
      const queryOptions = parser.parse(req.query, { predefined });

      const doc = await getById(LayerModel, id, queryOptions, ['slug']);
      if (!doc) {
        throw new RecordNotFound(`Could not retrieve document.`, 404);
      }

      const code = 200;
      const response = createSerializer(include).serialize(doc);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  return router;
};

const getAdminRouter = (basePath: string = '/', routePath: string = '/management/layers') => {
  const router: Router = Router();
  const path = urljoin(basePath, routePath);

  const parser = new MongooseQueryParser();
  const queryFilters: MongooseQueryFilter[] = [];

  router.get(
    path,
    validate([
      query('search').optional().isString().trim(),
      query('filter').optional().isString().trim(),
      query('include').optional().isString().trim(),
      query('select').optional().isString().trim(),
      query('sort').optional().isString().trim(),
      query('page[number]').optional().isInt({ min: 0 }),
      query('page[size]').optional().isInt({ min: 0 }),
      query('page[cursor]').optional().isString().trim(),
      query('group').optional().isString().trim(),
    ]),
    guard.enforcePrimaryGroup(),
    AuthzGuards.readLayersGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const search = <string>req.query.search;
      const include = queryParamGroup(<string>req.query.include);

      const predefined = queryFilters.concat([{ key: 'organization', op: 'in', value: req.groups }]);
      const queryOptions = parser.parse(req.query, { predefined }, ['search']);

      const searchResult = await LayerModel.esSearchOnlyIds(search, { organization: req.groups });
      const searchIds = search ? Object.keys(searchResult) : null;

      const { docs, total, cursor, aggs } = await getAll(LayerModel, queryOptions, searchIds, [
        'category',
        'type',
        'provider',
      ]);

      const paginator = new PaginationHelper({
        sizeTotal: total,
        pageSize: queryOptions.limit,
        currentPage: queryOptions.skip,
        currentCursor: queryOptions.cursor.encoded,
        nextCursor: cursor.next,
        previousCursor: cursor.previous,
      });
      const paginationLinks = paginator.getPaginationLinks(req.path, req.query);

      const meta: ResponseMeta = {
        results: total,
        pagination: {
          total: paginator.getPageCount(),
          size: queryOptions.limit,
        },
        filters: aggs,
      };
      if (queryOptions.cursor.decoded) {
        meta.pagination = merge(meta.pagination, { nextCursor: cursor.next, previousCursor: cursor.previous });
      } else {
        meta.pagination = merge(meta.pagination, { page: queryOptions.skip });
      }

      const searchedDocs = docs.map((doc) => ({
        ...doc.toObject(),
        $searchHint: searchResult[doc.id] || {},
      }));

      const code = 200;
      const response = createSerializer(include, paginationLinks, meta).serialize(searchedDocs);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.get(
    `${path}/slug`,
    validate([
      query('keyword').isString().trim().notEmpty(),
      query('type').trim().isIn(['counter', 'shortid']),
      query('group').optional().isString().trim(),
    ]),
    guard.enforcePrimaryGroup(true),
    AuthzGuards.readLocationsGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const keyword = <string>req.query.keyword;
      const type = req.query.type;

      logger.debug(`received keyword: ${keyword}`);

      const predefined = queryFilters.concat([{ key: 'organization', op: 'in', value: req.groups }]);
      const queryOptions = parser.parse(req.query, { predefined });

      const slug = await LayerModel.getUniqueSlug(keyword, queryOptions.filter, <any>type);

      const code = 200;
      const response = createSlugSerializer().serialize({ slug });

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.get(
    `${path}/:id`,
    validate([
      param('id').isString().trim().notEmpty(),
      query('include').optional().isString().trim(),
      query('select').optional().isString().trim(),
      query('sort').optional().isString().trim(),
      query('group').optional().isString().trim(),
    ]),
    guard.enforcePrimaryGroup(),
    AuthzGuards.readLayersGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const id = req.params.id;
      const include = queryParamGroup(<string>req.query.include);

      const predefined = queryFilters.concat([{ key: 'organization', op: 'in', value: req.groups }]);
      const queryOptions = parser.parse(req.query, { predefined });

      const doc = await getById(LayerModel, id, queryOptions, ['slug']);
      if (!doc) {
        throw new RecordNotFound(`Could not retrieve document.`, 404);
      }

      const code = 200;
      const response = createSerializer(include).serialize(doc);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.post(
    path,
    validate([
      body('slug').optional().isString().trim().notEmpty(),
      body('name').isString().trim().notEmpty(),
      body('description').optional().isString().trim(),
      body('type').isString().trim().notEmpty(),
      body('provider').isString().trim().notEmpty(),
      body('category').isArray(),
      body('category.*').isString().trim().notEmpty(),
      body('config').exists(),
      body('published').optional().isBoolean(),
      body('organization').optional().isString().trim(),
      body('references').optional().isArray(),
      body('references.*').optional().isString().trim().notEmpty(),
      query('include').optional().isString().trim(),
      query('select').optional().isString().trim(),
      query('group').optional().isString().trim(),
    ]),
    guard.enforcePrimaryGroup(true),
    AuthzGuards.writeLayersGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const include = queryParamGroup(<string>req.query.include);
      const queryOptions = parser.parse(req.query);

      const body = req.body;
      const data = merge(body, { organization: req.groups[0] }); // enforce a single primary group;

      const doc = await save(LayerModel, data, queryOptions);

      const code = 200;
      const response = createSerializer(include).serialize(doc);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.put(
    `${path}/:id`,
    validate([
      param('id').isString().trim().notEmpty(),
      body('slug').optional({ nullable: true }).isString().trim().notEmpty(),
      body('name').optional().isString().trim().notEmpty(),
      body('description').optional().isString().trim(),
      body('type').optional().isString().trim().notEmpty(),
      body('provider').optional().isString().trim().notEmpty(),
      body('category').optional().isArray(),
      body('category.*').optional().isString().trim().notEmpty(),
      body('config').optional().exists(),
      body('published').optional().isBoolean(),
      body('organization').optional().isString().trim(),
      body('references').optional({ nullable: true }).isArray(),
      body('references.*').optional().isString().trim().notEmpty(),
      body('version').optional().isNumeric(),
      query('include').optional().isString().trim(),
      query('select').optional().isString().trim(),
      query('group').optional().isString().trim(),
    ]),
    guard.enforcePrimaryGroup(true),
    AuthzGuards.writeLayersGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const id = req.params.id;
      const body = req.body;

      const include = queryParamGroup(<string>req.query.include);

      const predefined = queryFilters.concat([{ key: 'organization', op: 'in', value: req.groups }]);
      const queryOptions = parser.parse(null, { predefined });

      const doc = await getById(LayerModel, id, queryOptions, ['slug']);
      if (!doc) {
        throw new RecordNotFound(`Could not retrieve document.`, 404);
      }
      const data = merge(body, { organization: req.groups[0] }); // enforce a single primary group;

      const queryOptionsGet = parser.parse(req.query, { predefined });
      const updated = await update(LayerModel, doc, data, queryOptionsGet);

      const code = 200;
      const response = createSerializer(include).serialize(updated);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.delete(
    `${path}/:id`,
    validate([param('id').isString().trim().notEmpty(), query('group').optional().isString().trim()]),
    guard.enforcePrimaryGroup(),
    AuthzGuards.writeLayersGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const id = req.params.id;

      const predefined: MongooseQueryFilter[] = [{ key: 'organization', op: 'in', value: req.groups }];
      const queryOptions = parser.parse(req.query, { predefined });

      const doc = await getById(LayerModel, id, queryOptions, ['slug']);
      if (!doc) {
        throw new RecordNotFound(`Could not retrieve document.`, 404);
      }
      const success = await remove(LayerModel, doc);
      if (success) {
        logger.debug('[removeMapTiles] layer: %s', doc.id);
        await removeMapTiles([doc.id]);
      }

      const code = 200;
      const response = createStatusSerializer().serialize({ success });

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  return router;
};

export default { getRouter, getAdminRouter };
