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
import { param, query } from 'express-validator';
import { merge } from 'lodash';
import Redlock from 'redlock';
import urljoin from 'url-join';

import { DEFAULT_CONTENT_TYPE, REDIS_LOCK_TTL } from '../config';
import { DocumentError, RecordNotFound, TaskError, UnsupportedOperationType } from '../errors';
import { MongooseQueryFilter, MongooseQueryParser, QueryOptions } from '../helpers/mongoose';
import { PaginationHelper } from '../helpers/paginator';
import { forEachAsync } from '../helpers/util';
import { getLogger } from '../logging';
import { AuthzGuards, AuthzRequest, guard } from '../middlewares/authz-guards';
import { LocationModel, MetricModel } from '../models';
import { exists, getAll, getById, getOne, remove, removeById, aggregateCount } from '../models/utils';
import { createSerializer } from '../serializers/MetricSerializer';
import { createSerializer as createStatusSerializer } from '../serializers/StatusSerializer';
import { OperationTypeEnum, SNSComputeMetricEvent, triggerComputeMetricEvent } from '../services/sns';
import { ResponseMeta, SuccessResponse } from '../types/response';

import { queryParamGroup, validate } from '.';

const logger = getLogger();

const getRouter = (basePath: string = '/', routePath: string = '/metrics') => {
  const router: Router = Router();
  const path = urljoin(basePath, routePath);

  const parser = new MongooseQueryParser();
  const queryFilters: MongooseQueryFilter[] = [{ key: 'published', op: '==', value: true }];

  router.get(
    `${path}/slugs`,
    validate([]),
    guard.enforcePrimaryGroup(true, true),
    AuthzGuards.readMetricsGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const metrics = await aggregateCount(MetricModel, {}, 'slug');

      const code = 200;
      const response = createSerializer().serialize(metrics.map((metric) => ({ slug: metric.value })));

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.get(
    `${path}/:id/collection`,
    validate([query('metrics').isString().trim().notEmpty(), query('group').optional().isString().trim()]),
    guard.enforcePrimaryGroup(true, true),
    AuthzGuards.readMetricsGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const id = req.params.id;
      const metrics = queryParamGroup(<string>req.query.metrics);
      const include = queryParamGroup(<string>req.query.include);

      const predefined = queryFilters.concat([{ key: 'organization', op: 'in', value: req.groups }]);
      const queryOptions = parser.parse(req.query, { predefined });

      const doc = await getById(LocationModel, id, queryOptions, ['slug']);

      if (!doc) {
        throw new RecordNotFound(`Could not retrieve document.`, 404);
      }

      const predefined2: MongooseQueryFilter[] = [
        { key: 'location', op: 'in', value: doc.locations as string[] },
        { key: 'slug', op: 'in', value: metrics },
      ];
      const queryOptions2 = parser.parse(req.query, { predefined: predefined2 });

      const { docs } = await getAll(MetricModel, queryOptions2);

      const code = 200;
      const response = createSerializer(include).serialize(docs);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.get(
    `${path}/:locationId`,
    validate([
      param('locationId').isString().trim().notEmpty(),
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
    AuthzGuards.readMetricsGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const locationId = req.params.locationId;
      const include = queryParamGroup(<string>req.query.include);

      const predefined = queryFilters.concat([{ key: 'organization', op: 'in', value: req.groups }]);
      const queryOptions = parser.parse(req.query, { predefined }, ['search']);

      const parentId = await exists(LocationModel, locationId, queryOptions, ['slug']);
      if (!parentId) {
        throw new RecordNotFound(`Could not retrieve document.`, 404);
      }

      const predefined2: MongooseQueryFilter[] = [{ key: 'location', op: '==', value: parentId }];
      const queryOptions2 = parser.parse(req.query, { predefined: predefined2 });

      const { docs, total, cursor } = await getAll(MetricModel, queryOptions2);

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
      };
      if (queryOptions.cursor.decoded) {
        meta.pagination = merge(meta.pagination, { nextCursor: cursor.next, previousCursor: cursor.previous });
      } else {
        meta.pagination = merge(meta.pagination, { page: queryOptions.skip });
      }

      const code = 200;
      const response = createSerializer(include, paginationLinks, meta).serialize(docs);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.get(
    `${path}/:locationId/:metricId/`,
    validate([
      param('locationId').isString().trim().notEmpty(),
      param('metricId').isString().trim().notEmpty(),
      query('include').optional().isString().trim(),
      query('select').optional().isString().trim(),
      query('sort').optional().isString().trim(),
      query('group').optional().isString().trim(),
    ]),
    guard.enforcePrimaryGroup(false, true),
    AuthzGuards.readMetricsGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const locationId = req.params.locationId;
      const metricId = req.params.metricId;
      const include = queryParamGroup(<string>req.query.include);

      const predefined = queryFilters.concat([{ key: 'organization', op: 'in', value: req.groups }]);
      const queryOptions = parser.parse(req.query, { predefined });

      const parentId = await exists(LocationModel, locationId, queryOptions, ['slug']);
      if (!parentId) {
        throw new RecordNotFound(`Could not retrieve document.`, 404);
      }

      const predefined2: MongooseQueryFilter[] = [{ key: 'location', op: '==', value: parentId }];
      const queryOptions2 = parser.parse(req.query, { predefined: predefined2 });

      const doc = await getOne(MetricModel, metricId, queryOptions2, ['slug'], { version: -1 });
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

const getAdminRouter = (basePath: string = '/', routePath: string = '/management/metrics') => {
  const router: Router = Router();
  const path = urljoin(basePath, routePath);

  const parser = new MongooseQueryParser();
  const queryFilters: MongooseQueryFilter[] = [];

  router.get(
    `${path}/:locationId`,
    validate([
      param('locationId').isString().trim().notEmpty(),
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
    AuthzGuards.readMetricsGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const locationId = req.params.locationId;
      const include = queryParamGroup(<string>req.query.include);

      const predefined = queryFilters.concat([{ key: 'organization', op: 'in', value: req.groups }]);
      const queryOptions = parser.parse(req.query, { predefined });

      const parentId = await exists(LocationModel, locationId, queryOptions, ['slug']);
      if (!parentId) {
        throw new RecordNotFound(`Could not retrieve document.`, 404);
      }

      const predefined2: MongooseQueryFilter[] = [{ key: 'location', op: '==', value: parentId }];
      const queryOptions2 = parser.parse(req.query, { predefined: predefined2 });

      const { docs, total, cursor } = await getAll(MetricModel, queryOptions2);

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
      };
      if (queryOptions.cursor.decoded) {
        meta.pagination = merge(meta.pagination, { nextCursor: cursor.next, previousCursor: cursor.previous });
      } else {
        meta.pagination = merge(meta.pagination, { page: queryOptions.skip });
      }

      const code = 200;
      const response = createSerializer(include, paginationLinks, meta).serialize(docs);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.get(
    `${path}/:locationId/:metricId/`,
    validate([
      param('locationId').isString().trim().notEmpty(),
      param('metricId').isString().trim().notEmpty(),
      query('include').optional().isString().trim(),
      query('select').optional().isString().trim(),
      query('sort').optional().isString().trim(),
      query('group').optional().isString().trim(),
    ]),
    guard.enforcePrimaryGroup(),
    AuthzGuards.readMetricsGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const locationId = req.params.locationId;
      const metricId = req.params.metricId;
      const include = queryParamGroup(<string>req.query.include);

      const predefined = queryFilters.concat([{ key: 'organization', op: 'in', value: req.groups }]);
      const queryOptions = parser.parse(req.query, { predefined });

      const parentId = await exists(LocationModel, locationId, queryOptions, ['slug']);
      if (!parentId) {
        throw new RecordNotFound(`Could not retrieve document.`, 404);
      }

      const predefined2: MongooseQueryFilter[] = [{ key: 'location', op: '==', value: parentId }];
      const queryOptions2 = parser.parse(req.query, { predefined: predefined2 });

      const doc = await getOne(MetricModel, metricId, queryOptions2, ['slug'], { version: -1 });
      if (!doc) {
        throw new RecordNotFound(`Could not retrieve document.`, 404);
      }

      const code = 200;
      const response = createSerializer(include).serialize(doc);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.delete(
    `${path}/:locationId/`,
    validate([param('locationId').isString().trim().notEmpty(), query('group').optional().isString().trim()]),
    guard.enforcePrimaryGroup(),
    AuthzGuards.writeMetricsGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const locationId = req.params.locationId;

      const predefined: MongooseQueryFilter[] = [{ key: 'organization', op: 'in', value: req.groups }];
      const queryOptions = parser.parse(null, { predefined });

      const options: QueryOptions = merge(queryOptions, { select: { id: 1, metrics: 1 } });

      const parent = await getById(LocationModel, locationId, options, ['slug']);
      if (!parent) {
        throw new RecordNotFound('Could not retrieve document.', 404);
      }

      const statuses = await forEachAsync(parent.metrics, (id) => {
        return removeById(MetricModel, id, [], false);
      });
      if (!statuses.every((s) => !!s)) {
        throw new DocumentError('Could not delete documents.', 500);
      }

      const code = 200;
      const response = createStatusSerializer().serialize({ success: true });

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.delete(
    `${path}/:locationId/:metricId/`,
    validate([
      param('locationId').isString().trim().notEmpty(),
      param('metricId').isString().trim().notEmpty(),
      query('group').optional().isString().trim(),
    ]),
    guard.enforcePrimaryGroup(),
    AuthzGuards.writeMetricsGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const locationId = req.params.locationId;
      const metricId = req.params.metricId;

      const predefined: MongooseQueryFilter[] = [{ key: 'organization', op: 'in', value: req.groups }];
      const queryOptions = parser.parse(req.query, { predefined });

      const parentId = await exists(LocationModel, locationId, queryOptions, ['slug']);
      if (!parentId) {
        throw new RecordNotFound(`Could not retrieve document.`, 404);
      }

      const predefined2: MongooseQueryFilter[] = [{ key: 'location', op: '==', value: parentId }];
      const queryOptions2 = parser.parse(null, { predefined: predefined2 });

      const doc = await getOne(MetricModel, metricId, queryOptions2, ['slug'], { version: -1 });
      if (!doc) {
        throw new RecordNotFound(`Could not retrieve document.`, 404);
      }
      const success = await remove(MetricModel, doc);

      const code = 200;
      const response = createStatusSerializer().serialize({ success });

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.post(
    `${path}/:locationId/action`,
    validate([
      param('locationId').isString().trim().notEmpty(),
      query('operationType').trim().isIn(['calculate']),
      query('group').optional().isString().trim(),
    ]),
    guard.enforcePrimaryGroup(),
    AuthzGuards.writeMetricsGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const locationId = req.params.locationId;
      const operationType = req.query.operationType;

      if (!Object.values(OperationTypeEnum).includes(<any>operationType)) {
        throw new UnsupportedOperationType(`Unsupported operation type.`, 400);
      }

      const predefined: MongooseQueryFilter[] = [{ key: 'organization', op: 'in', value: req.groups }];
      const queryOptions = parser.parse(null, { predefined });

      const options: QueryOptions = merge(queryOptions, { select: { id: 1, slug: 1, version: 1 } });

      const parent = await getById(LocationModel, locationId, options, ['slug']);
      if (!parent) {
        throw new RecordNotFound(`Could not retrieve document.`, 404);
      }

      const redisClient = req.app.locals.redisClient;
      const redlock = new Redlock([redisClient], { retryCount: 1 });

      const resource: string = ['locks', parent.slug, operationType].join(':');

      await redlock
        .lock(resource, Number(REDIS_LOCK_TTL))
        .then(async () => {
          logger.debug(`successfully created lock for: ${resource}`);

          const message: SNSComputeMetricEvent = {
            id: parent.id,
            operationType: <any>operationType,
            version: parent.version,
            resources: [],
          };
          const messageId = await triggerComputeMetricEvent(message);

          const code = 200;
          const response: SuccessResponse = { code, data: { operationId: messageId } };

          res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
          res.status(code).send(response);
        })
        .catch((err) => {
          if (err.name === 'LockError') {
            throw new TaskError(`Task ${operationType} already scheduled or running for: ${parent.slug}`, 400);
          }
          logger.error(err);
          throw err;
        });
    })
  );

  router.post(
    `${path}/:locationId/:metricId/action`,
    validate([
      param('locationId').isString().trim().notEmpty(),
      param('metricId').isString().trim().notEmpty(),
      query('operationType').trim().isIn(['calculate']),
      query('group').optional().isString().trim(),
    ]),
    guard.enforcePrimaryGroup(),
    AuthzGuards.writeMetricsGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const locationId = req.params.locationId;
      const metricId = req.params.metricId;
      const operationType = req.query.operationType;

      if (!Object.values(OperationTypeEnum).includes(<any>operationType)) {
        throw new UnsupportedOperationType(`Unsupported operation type.`, 400);
      }

      const predefined: MongooseQueryFilter[] = [{ key: 'organization', op: 'in', value: req.groups }];
      const queryOptions = parser.parse(null, { predefined });

      const options: QueryOptions = merge(queryOptions, { select: { id: 1, slug: 1, version: 1 } });

      const parent = await getById(LocationModel, locationId, options, ['slug']);
      if (!parent) {
        throw new RecordNotFound(`Could not retrieve document.`, 404);
      }

      const predefined2: MongooseQueryFilter[] = [{ key: 'location', op: '==', value: parent.id }];
      const queryOptions2 = parser.parse(null, { predefined: predefined2 });

      const child = await getOne(MetricModel, metricId, queryOptions2, ['slug'], { version: -1 });
      if (!child) {
        throw new RecordNotFound(`Could not retrieve document.`, 404);
      }

      const redisClient = req.app.locals.redisClient;
      const redlock = new Redlock([redisClient], { retryCount: 1 });

      const resource: string = ['locks', parent.slug, child.slug, operationType].join(':');

      await redlock
        .lock(resource, Number(REDIS_LOCK_TTL))
        .then(async () => {
          logger.debug(`successfully created lock for: ${resource}`);

          const message: SNSComputeMetricEvent = {
            id: parent.id,
            operationType: <any>operationType,
            version: parent.version,
            resources: [child.slug],
          };
          const messageId = await triggerComputeMetricEvent(message);

          const code = 200;
          const response: SuccessResponse = { code, data: { operationId: messageId } };

          res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
          res.status(code).send(response);
        })
        .catch((err) => {
          if (err.name === 'LockError') {
            throw new TaskError(
              `Task ${operationType} already scheduled or running for: ${parent.slug} and: ${child.slug}`,
              400
            );
          }
          logger.error(err);
          throw err;
        });
    })
  );

  return router;
};

export default { getRouter, getAdminRouter };
