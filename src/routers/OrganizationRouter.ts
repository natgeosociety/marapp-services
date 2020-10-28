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
import { compact, get, set } from 'lodash';
import urljoin from 'url-join';

import { DEFAULT_CONTENT_TYPE } from '../config';
import { ParameterRequiredError, RecordNotFound } from '../errors';
import { MongooseQueryFilter, MongooseQueryParser } from '../helpers/mongoose';
import { PaginationHelper } from '../helpers/paginator';
import { forEachAsync } from '../helpers/util';
import { getLogger } from '../logging';
import { AuthzGuards, AuthzRequest, guard } from '../middlewares/authz-guards';
import { CollectionModel, DashboardModel, LayerModel, LocationModel, WidgetModel } from '../models';
import { countByQuery } from '../models/utils';
import { createSerializer } from '../serializers/OrganizationSerializer';
import { createSerializer as createStatsSerializer } from '../serializers/StatsSerializer';
import { createSerializer as createStatusSerializer } from '../serializers/StatusSerializer';
import { createBulkSerializer as createUserBulkSerializer } from '../serializers/UserSerializer';
import { AuthzServiceSpec } from '../services/auth0-authz';
import { AuthManagementService } from '../services/auth0-management';
import { MembershipService } from '../services/membership-service';
import { SNSComputeMetricEvent, SNSWipeDataEvent, triggerWipeDataEvent } from '../services/sns';
import { ResponseMeta } from '../types/response';

import { queryParamGroup, validate } from '.';

const logger = getLogger();

const getRouter = (basePath: string = '/', routePath: string = '/organizations') => {
  const router: Router = Router();
  const path = urljoin(basePath, routePath);

  const parser = new MongooseQueryParser();
  const queryFilters: MongooseQueryFilter[] = [
    { key: 'published', op: '==', value: String(true) },
    { key: '*.published', op: '==', value: String(true) },
  ];

  router.get(
    `${path}/stats`,
    validate([query('group').isString().trim()]),
    guard.enforcePrimaryGroup(false, true),
    AuthzGuards.readLocationsGuard,
    AuthzGuards.readLayersGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const items = [
        { model: LocationModel, query: queryFilters },
        {
          model: LayerModel,
          query: queryFilters.concat([{ key: 'primary', op: '==', value: String(true) }]),
        },
      ];

      const data = await Promise.all(
        req.groups.map((group) =>
          forEachAsync(items, async (item) =>
            countByQuery(
              item.model,
              parser.parse(null, { predefined: item.query.concat([{ key: 'organization', op: '==', value: group }]) })
                .filter
            )
          ).then(([locations, layers]) => ({ name: group, locations, layers }))
        )
      );

      const code = 200;
      const response = createStatsSerializer().serialize(data);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  return router;
};

const getAdminRouter = (basePath: string = '/', routePath: string = '/management/organizations') => {
  const router: Router = Router();
  const path = urljoin(basePath, routePath);

  const parser = new MongooseQueryParser();
  const queryFilters: MongooseQueryFilter[] = [];

  router.get(
    `${path}/stats`,
    validate([query('include').optional().isString().trim(), query('group').isString().trim()]),
    guard.enforcePrimaryGroup(true),
    AuthzGuards.readStatsGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzServiceSpec = req.app.locals.authzService;

      const include = queryParamGroup(<string>req.query.include);

      const predefined = queryFilters.concat([{ key: 'organization', op: 'in', value: req.groups }]);
      const queryOptions = parser.parse(null, { predefined });

      const groups = await authzService.getGroups(req.groups);
      if (!groups.total) {
        throw new RecordNotFound(`Could not retrieve document.`, 404);
      }
      const group = groups.groups[0];

      const [locations, collections, layers, widgets, dashboards] = await forEachAsync(
        [LocationModel, CollectionModel, LayerModel, WidgetModel, DashboardModel],
        async (model) => countByQuery(model, queryOptions.filter)
      );

      const data = {
        id: group?._id,
        slug: group?.name,
        name: group?.description,
        locations,
        collections,
        layers,
        widgets,
        dashboards,
      };
      if (include.includes('owners')) {
        const owners = <any>await authzService.getGroupOwners(group._id);
        set(
          data,
          'owners',
          owners.map((owner) => owner?.email)
        );
      }

      const code = 200;
      const response = createStatsSerializer().serialize(data);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.get(
    path,
    validate([
      query('include').optional().isString().trim(),
      query('page[number]').optional().isInt({ min: 0 }),
      query('page[size]').optional().isInt({ min: 0 }),
    ]),
    AuthzGuards.readOrganizationsGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzServiceSpec = req.app.locals.authzService;

      const include = queryParamGroup(<string>req.query.include);
      const pageNumber = get(req.query, 'page.number', 0);
      const pageSize = get(req.query, 'page.size', 25);

      const pageOptions = {
        page: Math.max(parseInt(<string>pageNumber), 1),
        size: Math.min(Math.max(parseInt(<string>pageSize), 0), 25),
      };

      const all = await authzService.getGroups();
      const nested = all.groups.filter((g) => 'nested' in g);

      const groups = await forEachAsync(nested, async (group) => {
        const entry = {
          id: group?._id,
          slug: group?.name,
          name: group?.description,
        };
        if (include.includes('owners')) {
          const owners = <any>await authzService.getGroupOwners(group._id);
          set(
            entry,
            'owners',
            owners.map((owner) => owner?.email)
          );
        }
        return entry;
      });

      const paginationOffset = (pageOptions.page - 1) * pageOptions.size;
      const paginatedGroups = groups.slice(paginationOffset, paginationOffset + pageOptions.size);

      const paginator = new PaginationHelper({
        sizeTotal: groups.length,
        pageSize: pageOptions.size,
        currentPage: pageOptions.page,
      });
      const paginationLinks = paginator.getPaginationLinks(req.path, req.query);

      const meta: ResponseMeta = {
        results: groups.length,
        pagination: {
          total: paginator.getPageCount(),
          size: pageOptions.size,
        },
      };

      const code = 200;
      const response = createSerializer(include, paginationLinks, meta).serialize(paginatedGroups);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.get(
    `${path}/:id`,
    validate([param('id').isString().trim().notEmpty(), query('include').optional().isString().trim()]),
    AuthzGuards.readOrganizationsGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzServiceSpec = req.app.locals.authzService;

      const id = req.params.id;
      const include = queryParamGroup(<string>req.query.include);

      const group = await authzService.getGroup(id);
      if (!group) {
        throw new RecordNotFound(`Could not retrieve document.`, 404);
      }

      const data = {
        id: group?._id,
        slug: group?.name,
        name: group?.description,
      };
      if (include.includes('owners')) {
        const owners = <any>await authzService.getGroupOwners(group._id);
        set(
          data,
          'owners',
          owners.map((owner) => owner?.email)
        );
      }

      const code = 200;
      const response = createSerializer(include).serialize(data);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.put(
    `${path}/:id`,
    validate([
      param('id').isString().trim().notEmpty(),
      body('slug').optional().isString().trim().notEmpty(),
      body('name').optional().isString().trim().notEmpty(),
      body('owners').optional().isArray(),
      body('owners.*').optional().trim().isEmail(),
      query('include').optional().isString().trim(),
    ]),
    AuthzGuards.writeOrganizationsGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzServiceSpec = req.app.locals.authzService;
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const id = req.params.id;
      const include = queryParamGroup(<string>req.query.include);

      const { name, owners } = req.body;

      const group = await authzService.getGroup(id);
      if (!group) {
        throw new RecordNotFound(`Could not retrieve document.`, 404);
      }

      if (owners) {
        const tempData: { email: string; error?: string; status?: number }[] = [];

        const ownerIds = await forEachAsync(owners, async (email: any) => {
          try {
            const user = await authMgmtService.getUserByEmail(email);
            logger.debug(`resolved owner ${user.user_id} for email: ${email}`);
            tempData.push({ email: user.email, status: 200 });
            return user.user_id;
          } catch (err) {
            logger.debug(`unresolved owner for email: ${email}`);
            logger.error(err.message);
            tempData.push({ email: email, error: err.message, status: err.code });
          }
        });

        if (tempData.some((res) => ![200, 409].includes(res.status))) {
          const code = 400;
          const response = createUserBulkSerializer().serialize(tempData);

          res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
          res.status(code).send(response);

          return;
        }

        const nestedGroups = await authzService.getNestedGroups(id, ['OWNER']);
        const memberIds = get(nestedGroups[0], 'members', []);
        const groupId = nestedGroups[0]._id;

        const addUserIds = ownerIds.filter((userId) => !memberIds.includes(userId));
        const removeUserIds = memberIds.filter((userId) => !ownerIds.includes(userId));

        if (addUserIds.length) {
          await authzService.addGroupMembers(groupId, addUserIds);
        }
        if (removeUserIds.length) {
          await authzService.deleteGroupMembers(groupId, removeUserIds);
        }
      }
      const description = name && name.trim() ? name.trim() : group?.description;
      const updated = await authzService.updateGroup(id, group.name, description);

      const data = {
        id: updated?._id,
        slug: updated?.name,
        name: updated?.description,
      };
      if (include.includes('owners')) {
        const owners = <any>await authzService.getGroupOwners(updated._id);
        set(
          data,
          'owners',
          owners.map((owner) => owner?.email)
        );
      }

      const code = 200;
      const response = createSerializer().serialize(data);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.post(
    path,
    validate([
      body('slug').isString().trim().notEmpty(),
      body('name').isString().trim().notEmpty(),
      body('owners').isArray(),
      body('owners.*').trim().isEmail(),
      query('include').optional().isString().trim(),
    ]),
    AuthzGuards.writeOrganizationsGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzServiceSpec = req.app.locals.authzService;
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const membershipService = new MembershipService(authzService);

      const include = queryParamGroup(<string>req.query.include);

      const { slug, name, owners } = req.body;

      if (!membershipService.enforceOrganizationName(slug)) {
        throw new ParameterRequiredError('Invalid format for field: slug', 400);
      }

      const tempData: { email: string; error?: string; status?: number }[] = [];

      const ownerIds = await forEachAsync(owners, async (email) => {
        try {
          const user = await authMgmtService.getUserByEmail(email);
          logger.debug(`resolved owner ${user.user_id} for email: ${email}`);
          tempData.push({ email: user.email, status: 200 });
          return user.user_id;
        } catch (err) {
          logger.debug(`unresolved owner for email: ${email}`);
          logger.error(err.message);
          tempData.push({ email: email, error: err.message, status: err.code });
        }
      });

      if (tempData.some((res) => ![200, 409].includes(res.status))) {
        const code = 400;
        const response = createUserBulkSerializer().serialize(tempData);

        res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
        res.status(code).send(response);

        return;
      }

      const group = await membershipService.createOrganization(slug, name, ownerIds);

      const data = {
        id: group?._id,
        slug: group?.name,
        name: group?.description,
      };
      if (include.includes('owners')) {
        const owners = <any>await authzService.getGroupOwners(group._id);
        set(
          data,
          'owners',
          owners.map((owner) => owner?.email)
        );
      }

      const code = 200;
      const response = createSerializer().serialize(data);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.delete(
    `${path}/:id`,
    validate([param('id').isString().trim().notEmpty()]),
    AuthzGuards.writeOrganizationsGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzServiceSpec = req.app.locals.authzService;
      const membershipService = new MembershipService(authzService);

      const id = req.params.id;

      const group = await authzService.getGroup(id);
      if (!group) {
        throw new RecordNotFound(`Could not retrieve document.`, 404);
      }
      const groupId = group?._id;

      let success: boolean;
      try {
        success = await membershipService.deleteOrganization(groupId);
        if (success) {
          const message: SNSWipeDataEvent = {
            organizationId: groupId,
            organizationName: group.name,
          };
          await triggerWipeDataEvent(message);
        }
      } catch (err) {
        logger.error(err);
        success = false;
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
