import { Response, Router } from 'express';
import asyncHandler from 'express-async-handler';
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
import { ResponseMeta, SuccessResponse } from '../types/response';

import { queryParamGroup } from '.';

const logger = getLogger();

const getRouter = (basePath: string = '/', routePath: string = '/layers') => {
  const router: Router = Router();
  const path = urljoin(basePath, routePath);

  const queryFilters: MongooseQueryFilter[] = [
    { key: 'published', op: '==', value: String(true) },
    { key: '*.published', op: '==', value: String(true) },
  ];
  const parser = new MongooseQueryParser();

  router.get(
    path,
    guard.enforcePrimaryGroup(false, true),
    AuthzGuards.readLayersGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const search = <string>req.query.search;
      const include = queryParamGroup(<string>req.query.include);

      const predefined = queryFilters.concat([{ key: 'organization', op: 'in', value: req.groups }]);
      const queryOptions = parser.parse(req.query, { predefined }, ['search']);

      const searchResult = await LayerModel.esSearchOnlyIds(search, { organization: req.groups, published: true });
      const searchIds = Object.keys(searchResult);

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
    guard.enforcePrimaryGroup(),
    AuthzGuards.readLayersGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const search = <string>req.query.search;
      const include = queryParamGroup(<string>req.query.include);

      const predefined = queryFilters.concat([{ key: 'organization', op: 'in', value: req.groups }]);
      const queryOptions = parser.parse(req.query, { predefined }, ['search']);

      const searchResult = await LayerModel.esSearchOnlyIds(search, { organization: req.groups });
      const searchIds = Object.keys(searchResult);

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
    guard.enforcePrimaryGroup(true),
    AuthzGuards.writeLayersGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const body = req.body;
      const data = merge(body, { organization: req.groups[0] }); // enforce a single primary group;

      const doc = await save(LayerModel, data);

      const code = 200;
      const response = createSerializer().serialize(doc);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.put(
    `${path}/:id`,
    guard.enforcePrimaryGroup(true),
    AuthzGuards.writeLayersGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const id = req.params.id;
      const body = req.body;

      const predefined = queryFilters.concat([{ key: 'organization', op: 'in', value: req.groups }]);
      const queryOptions = parser.parse(req.query, { predefined });

      const doc = await getById(LayerModel, id, queryOptions, ['slug']);
      if (!doc) {
        throw new RecordNotFound(`Could not retrieve document.`, 404);
      }
      const data = merge(body, { organization: req.groups[0] }); // enforce a single primary group;

      const updated = await update(LayerModel, doc, data);

      const code = 200;
      const response = createSerializer().serialize(updated);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.delete(
    `${path}/:id`,
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

      const code = 200;
      const response: SuccessResponse = { code, data: { success } };

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  return router;
};

export default { getRouter, getAdminRouter };
