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
import { get, set } from 'lodash';
import urljoin from 'url-join';

import { DEFAULT_CONTENT_TYPE } from '../config';
import { ParameterRequiredError, RecordNotFound } from '../errors';
import { MongooseQueryFilter, MongooseQueryParser } from '../helpers/mongoose';
import { PaginationHelper } from '../helpers/paginator';
import { forEachAsync, validateKeys } from '../helpers/util';
import { getLogger } from '../logging';
import { AuthzGuards, AuthzRequest, guard } from '../middlewares/authz-guards';
import { CollectionModel, DashboardModel, LayerModel, LocationModel, WidgetModel } from '../models';
import { countByQuery } from '../models/utils';
import { createSerializer } from '../serializers/OrganizationSerializer';
import { createSerializer as createStatsSerializer } from '../serializers/StatsSerializer';
import { AuthzServiceSpec } from '../services/auth0-authz';
import { AuthManagementService } from '../services/auth0-management';
import { MembershipService } from '../services/membership-service';
import { ResponseMeta, SuccessResponse } from '../types/response';

import { queryParamGroup } from '.';

const logger = getLogger();

const getAdminRouter = (basePath: string = '/', routePath: string = '/management/organizations') => {
  const router: Router = Router();
  const path = urljoin(basePath, routePath);

  const parser = new MongooseQueryParser();
  const queryFilters: MongooseQueryFilter[] = [];

  router.get(
    `${path}/stats`,
    guard.enforcePrimaryGroup(true),
    AuthzGuards.readStatsGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzServiceSpec = req.app.locals.authzService;

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
        name: group?.name,
        slug: group?.name,
        description: group?.description,
        locations,
        collections,
        layers,
        widgets,
        dashboards,
      };

      const code = 200;
      const response = createStatsSerializer().serialize(data);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.get(
    path,
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
          name: group?.name,
          description: group?.description,
        };
        if (include.includes('owners')) {
          const owners = await authzService.getGroupOwners(group._id);
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
    AuthzGuards.readOrganizationsGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzServiceSpec = req.app.locals.authzService;

      const id = req.params.id;
      const include = queryParamGroup(<string>req.query.include);

      const group = await authzService.getGroup(id);
      if (!group) {
        throw new RecordNotFound(`Could not retrieve document.`, 404);
      }

      const owners = await authzService.getGroupOwners(id);
      const data = {
        ...group,
        id: group._id,
        owners: owners.map((owner) => owner.email),
      };

      const code = 200;
      const response = createSerializer(include).serialize(data);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.post(
    path,
    AuthzGuards.writeOrganizationsGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzServiceSpec = req.app.locals.authzService;
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      validateKeys(req.body, ['name', 'description', 'owners']);
      const { name, description, owners } = req.body;

      const groupName = name.trim();
      const groupDescription = description.trim();

      if (!groupName) {
        throw new ParameterRequiredError('Invalid name.', 400);
      }
      if (!groupDescription) {
        throw new ParameterRequiredError('Invalid description.', 400);
      }
      if (!Array.isArray(owners)) {
        throw new ParameterRequiredError('Invalid owners.', 400);
      }

      const ownerIds = await forEachAsync(owners, async (email) => {
        const user = await authMgmtService.getUserByEmail(email);
        logger.debug(`resolved owner ${user.user_id} for email: ${email}`);

        return user.user_id;
      });

      const membershipService = new MembershipService(authzService);

      const group = await membershipService.createOrganization(groupName, groupDescription, ownerIds);
      const groupOwners = await authzService.getGroupOwners(group._id);

      const data = {
        ...group,
        id: group._id,
        owners: groupOwners.map((owner) => owner.email),
      };

      const code = 200;
      const response = createSerializer().serialize(data);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.put(
    `${path}/:id`,
    AuthzGuards.writeOrganizationsGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzServiceSpec = req.app.locals.authzService;
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const id = req.params.id;

      validateKeys(req.body, ['description', 'owners']);
      const { description, owners } = req.body;

      const groupDescription = description.trim();

      if (!groupDescription) {
        throw new ParameterRequiredError('Invalid description.', 400);
      }
      if (!Array.isArray(owners)) {
        throw new ParameterRequiredError('Invalid owners.', 400);
      }

      const group = await authzService.getGroup(id);
      if (!group) {
        throw new RecordNotFound(`Could not retrieve document.`, 404);
      }

      const ownerIds = await forEachAsync(owners, async (email: any) => {
        const user = await authMgmtService.getUserByEmail(email);
        logger.debug(`resolved owner ${user.user_id} for email: ${email}`);

        return user.user_id;
      });

      const nestedGroups = await authzService.getNestedGroups(id, ['OWNER']);
      const memberIds = get(nestedGroups[0], 'members', []);

      const ownersOperations = [
        ...ownerIds.filter((userId) => !memberIds.includes(userId)).map((userId) => ({ operation: 'add', userId })),
        ...memberIds.filter((userId) => !ownerIds.includes(userId)).map((userId) => ({ operation: 'remove', userId })),
      ];

      await forEachAsync(ownersOperations, async (item: any) => {
        if (item.operation === 'add') {
          return authzService.addGroupMembers(nestedGroups[0]._id, [item.userId]);
        } else if (item.operation === 'remove') {
          return authzService.deleteGroupMembers(nestedGroups[0]._id, [item.userId]);
        }
      });
      const updated = await authzService.updateGroup(id, group.name, groupDescription);

      const code = 200;
      const response = createSerializer().serialize(updated);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.delete(
    `${path}/:id`,
    AuthzGuards.writeOrganizationsGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzServiceSpec = req.app.locals.authzService;

      const id = req.params.id;

      const group = await authzService.getGroup(id);
      if (!group) {
        throw new RecordNotFound(`Could not retrieve document.`, 404);
      }

      const membershipService = new MembershipService(authzService);
      const success = await membershipService.deleteOrganization(group._id);

      const code = 200;
      const response: SuccessResponse = { code, data: { success } };

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  return router;
};

export default { getAdminRouter };
