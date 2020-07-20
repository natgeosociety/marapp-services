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
import { NotImplementedError, RecordNotFound } from '../errors';
import { PaginationHelper } from '../helpers/paginator';
import { forEachAsync } from '../helpers/util';
import { getLogger } from '../logging';
import { AuthzGuards, AuthzRequest, guard } from '../middlewares/authz-guards';
import { createSerializer as createGroupSerializer } from '../serializers/GroupRoleSerializer';
import { createSerializer as createUserSerializer } from '../serializers/UserSerializer';
import { AuthzService } from '../services/auth0-authz';
import { AuthManagementService } from '../services/auth0-management';
import { ResponseMeta, SuccessResponse } from '../types/response';

import { queryParamGroup } from './index';

const logger = getLogger();

const getAdminRouter = (basePath: string = '/', routePath: string = '/management/users') => {
  const router: Router = Router();
  const path = urljoin(basePath, routePath);

  router.get(
    path,
    guard.enforcePrimaryGroup(true),
    AuthzGuards.readUsersGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzService = req.app.locals.authzService;

      const include = queryParamGroup(<string>req.query.include);
      const pageNumber = get(req.query, 'page.number', 0);
      const pageSize = get(req.query, 'page.size', 25);

      const pageOptions = {
        page: Math.max(parseInt(<string>pageNumber), 1),
        size: Math.min(Math.max(parseInt(<string>pageSize), 0), 25),
      };

      const groupMembership = await authzService.calculateGroupMemberships(req.identity.sub);
      const groupId = authzService.findPrimaryGroupId(groupMembership, req.groups[0]); // enforce a single primary group;

      const nestedGroups = await authzService.getNestedGroups(groupId);
      const nestedGroupRoles = await forEachAsync(nestedGroups, async (group: any) => {
        return authzService.getNestedGroupRoles(group._id);
      });

      const { docs, total } = await authzService.getNestedGroupMembers(groupId, pageOptions.page, pageOptions.size);
      const groupRoles = authzService.mapNestedGroupRoles(nestedGroupRoles);

      const members = docs.map((user) => {
        const userId = get(user, 'user.user_id');
        const groups = groupRoles.filter((groupRole: any) => get(groupRole, 'members', []).includes(userId));

        return {
          id: get(user, 'user.email'),
          email: get(user, 'user.email'),
          name: get(user, 'user.name'),
          groups: groups,
        };
      });

      const paginator = new PaginationHelper({
        sizeTotal: total,
        pageSize: pageOptions.size,
        currentPage: pageOptions.page,
      });
      const paginationLinks = paginator.getPaginationLinks(req.path, req.query);

      const meta: ResponseMeta = {
        results: total,
        pagination: {
          total: paginator.getPageCount(),
          size: pageOptions.size,
        },
      };

      const code = 200;
      const response = createUserSerializer(include, paginationLinks, meta).serialize(members);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.get(
    `${path}/groups`,
    guard.enforcePrimaryGroup(true),
    AuthzGuards.readUsersGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzService = req.app.locals.authzService;

      const include = queryParamGroup(<string>req.query.include);

      const groupMembership = await authzService.calculateGroupMemberships(req.identity.sub);
      const groupId = authzService.findPrimaryGroupId(groupMembership, req.groups[0]); // enforce a single primary group;

      const nestedGroups = await authzService.getNestedGroups(groupId);
      const nestedGroupRoles = await forEachAsync(nestedGroups, async (group: any) => {
        return authzService.getNestedGroupRoles(group._id);
      });

      const groupRoles = authzService.mapNestedGroupRoles(nestedGroupRoles);

      const code = 200;
      const response = createGroupSerializer(include).serialize(groupRoles);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.get(
    `${path}/:email`,
    guard.enforcePrimaryGroup(true),
    AuthzGuards.readUsersGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzService = req.app.locals.authzService;
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const email = req.params.email;
      const include = queryParamGroup(<string>req.query.include);

      const user = await authMgmtService.getUserByEmail(email);
      const userId = get(user, 'user_id');

      const groupMembership = await authzService.calculateGroupMemberships(req.identity.sub);
      const groupId = authzService.findPrimaryGroupId(groupMembership, req.groups[0]); // enforce a single primary group;

      const nestedGroups = await authzService.getNestedGroups(groupId);
      const nestedGroupRoles = await forEachAsync(nestedGroups, async (group: any) => {
        return authzService.getNestedGroupRoles(group._id);
      });

      const groupRoles = authzService.mapNestedGroupRoles(nestedGroupRoles);
      const groups = groupRoles.filter((groupRole: any) => get(groupRole, 'members', []).includes(userId));

      const data = {
        id: get(user, 'email'),
        email: get(user, 'email'),
        name: get(user, 'name'),
        groups: groups,
      };

      const code = 200;
      const response = createUserSerializer(include).serialize(data);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.post(
    path,
    guard.enforcePrimaryGroup(true),
    AuthzGuards.writeUsersGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzService = req.app.locals.authzService;
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const body = req.body;

      throw new NotImplementedError('Not Implemented.', 501);

      const code = 200;
      const response = {};

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.put(
    `${path}/:email`,
    guard.enforcePrimaryGroup(true),
    AuthzGuards.writeUsersGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzService = req.app.locals.authzService;
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const email = req.params.email;
      const body = req.body;

      const user = await authMgmtService.getUserByEmail(email);
      const userId = get(user, 'user_id');

      const groupMembership = await authzService.calculateGroupMemberships(req.identity.sub);
      const groupId = authzService.findPrimaryGroupId(groupMembership, req.groups[0]); // enforce a single primary group;

      const groups = get(body, 'groups', []);
      const nestedGroups = await authzService.getNestedGroups(groupId);
      const available = nestedGroups.map((group: any) => get(group, '_id'));

      if (groups.length && !groups.every((r) => available.includes(r))) {
        throw new RecordNotFound('Invalid group specified.', 404);
      }

      const responses = await forEachAsync(nestedGroups, async (group: any) => {
        const groupId = get(group, '_id');
        const members = get(group, 'members', []);

        if (!members.includes(userId) && groups.includes(groupId)) {
          return authzService.addGroupMembers(groupId, [userId]); // add to group;
        }
        if (members.includes(userId) && !groups.includes(groupId)) {
          return authzService.deleteGroupMembers(groupId, [userId]); // remove from group;
        }
      });
      const success = !!responses;

      const code = 200;
      const response: SuccessResponse = { code, data: { success } };

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.delete(
    `${path}/:email`,
    guard.enforcePrimaryGroup(true),
    AuthzGuards.writeUsersGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzService = req.app.locals.authzService;
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const email = req.params.email;

      const user = await authMgmtService.getUserByEmail(email);
      const userId = get(user, 'user_id');

      const groupMembership = await authzService.calculateGroupMemberships(req.identity.sub);
      const groupId = authzService.findPrimaryGroupId(groupMembership, req.groups[0]); // enforce a single primary group;

      const nestedGroups = await authzService.getNestedGroups(groupId);

      const responses = await forEachAsync(nestedGroups, async (group: any) => {
        const members = get(group, 'members', []);
        if (members.includes(userId)) {
          const groupId = get(group, '_id');
          return authzService.deleteGroupMembers(groupId, [userId]);
        }
      });
      const success = !!responses;

      const code = 200;
      const response: SuccessResponse = { code, data: { success } };

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  return router;
};

export default { getAdminRouter };
