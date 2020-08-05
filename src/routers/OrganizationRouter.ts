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
import { get } from 'lodash';
import urljoin from 'url-join';

import { DEFAULT_CONTENT_TYPE } from '../config';
import { PaginationHelper } from '../helpers/paginator';
import { forEachAsync } from '../helpers/util';
import { getLogger } from '../logging';
import { AuthzGuards, AuthzRequest, guard } from '../middlewares/authz-guards';
import { createSerializer as createOrganizationSerializer } from '../serializers/OrganizationSerializer';
import { AuthzService } from '../services/auth0-authz';
import { AuthManagementService } from '../services/auth0-management';
import { ResponseMeta, SuccessResponse } from '../types/response';

import { queryParamGroup } from '.';

const logger = getLogger();

const getAdminRouter = (basePath: string = '/', routePath: string = '/management/organizations') => {
  const router: Router = Router();
  const path = urljoin(basePath, routePath);

  router.get(
    path,
    guard.enforcePrimaryGroup(true),
    AuthzGuards.readOrganizationsGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzService = req.app.locals.authzService;

      const include = queryParamGroup(<string>req.query.include);
      const pageNumber = get(req.query, 'page.number', 0);
      const pageSize = get(req.query, 'page.size', 25);

      const pageOptions = {
        page: Math.max(parseInt(<string>pageNumber), 1),
        size: Math.min(Math.max(parseInt(<string>pageSize), 0), 25),
      };

      const allGroups = (await authzService.getGroups()).groups;
      const nested = allGroups.filter((g) => 'nested' in g);

      const groups = await forEachAsync(nested, async (group) => {
        const owners = await authzService.getGroupOwners(group._id);

        return {
          id: group._id,
          name: group.name,
          description: group.description,
          owners: owners.map((owner) => owner.email),
        };
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
      const response = createOrganizationSerializer(include, paginationLinks, meta).serialize(paginatedGroups);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.get(
    `${path}/:id`,
    guard.enforcePrimaryGroup(true),
    AuthzGuards.readOrganizationsGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzService = req.app.locals.authzService;

      const id = req.params.id;
      const include = queryParamGroup(<string>req.query.include);

      const group = await authzService.getGroup(id);
      const owners = await authzService.getGroupOwners(id);

      const code = 200;
      const response = createOrganizationSerializer(include).serialize({
        id,
        owners: owners.map((owner) => owner.email),
        ...group,
      });

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.put(
    `${path}/:id`,
    guard.enforcePrimaryGroup(true),
    AuthzGuards.writeOrganizationsGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzService = req.app.locals.authzService;
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const id = req.params.id;
      const body = req.body;

      const description = get(body, 'description', '');
      const ownersEmails = get(body, 'owners', []);

      const group = await authzService.getGroup(id);

      const owners = await forEachAsync(ownersEmails, async (owner: any) => {
        const user = await authMgmtService.getUserByEmail(owner);

        return user.user_id;
      });

      const nestedGroups = await authzService.getNestedGroups(id);

      const ownerGroup = nestedGroups.find((group) => group.name.endsWith('OWNER'));

      const ownersOperations = [
        ...owners
          .filter((userId) => !ownerGroup.members.includes(userId))
          .map((userId) => ({ operation: 'add', userId })),

        ...ownerGroup.members
          .filter((userId) => !owners.includes(userId))
          .map((userId) => ({ operation: 'remove', userId })),
      ];

      const responses = await forEachAsync(ownersOperations, async (item: any) => {
        if (item.operation === 'add') {
          return authzService.addGroupMembers(ownerGroup._id, [item.userId]);
        } else if (item.operation === 'remove') {
          return authzService.deleteGroupMembers(ownerGroup._id, [item.userId]);
        }
      });

      const success = !!responses && !!(await authzService.updateGroup(id, group.name, description));

      const code = 200;
      const response: SuccessResponse = { code, data: { success } };

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  return router;
};

export default { getAdminRouter };
