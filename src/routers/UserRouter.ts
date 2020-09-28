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
import { AlreadyExistsError, RecordNotFound, UnauthorizedError } from '../errors';
import { PaginationHelper } from '../helpers/paginator';
import { forEachAsync } from '../helpers/util';
import { getLogger } from '../logging';
import { AuthzGuards, AuthzRequest, guard } from '../middlewares/authz-guards';
import { createSerializer as createGroupSerializer } from '../serializers/GroupRoleSerializer';
import { createSerializer as createStatusSerializer } from '../serializers/StatusSerializer';
import { createSerializer as createUserSerializer } from '../serializers/UserSerializer';
import { AuthzServiceSpec } from '../services/auth0-authz';
import { AuthManagementService } from '../services/auth0-management';
import { ResponseMeta } from '../types/response';

import { queryParamGroup, requireReqBodyKeys, requireReqParamKeys, validateEmail } from '.';

const logger = getLogger();

const getProfileRouter = (basePath: string = '/', routePath: string = '/users/profile') => {
  const router: Router = Router();
  const path = urljoin(basePath, routePath);

  router.get(
    path,
    guard.includeGroups(),
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzServiceSpec = req.app.locals.authzService;
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const include = queryParamGroup(<string>req.query.include);

      const user = await authMgmtService.getUser(req.identity.sub);
      const userId = get(user, 'user_id');

      const data = {
        id: user?.email,
        email: user?.email,
        name: user?.name, // deprecated;
        firstName: user?.given_name,
        lastName: user?.family_name,
        pendingEmail: user?.user_metadata?.pendingUserEmail,
      };

      if (include.includes('groups')) {
        const groups = await authzService.getMemberGroups(userId, req.groups);
        set(data, 'groups', groups);
      }

      const code = 200;
      const response = createUserSerializer(include).serialize(data);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.put(
    path,
    guard.includeGroups(),
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzServiceSpec = req.app.locals.authzService;
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const include = queryParamGroup(<string>req.query.include);
      const { firstName, lastName } = req.body;

      const user = await authMgmtService.getUser(req.identity.sub);
      const userId = get(user, 'user_id');

      const update = {
        given_name: firstName && firstName.trim() ? firstName.trim() : user?.given_name,
        family_name: lastName && lastName.trim() ? lastName.trim() : user?.family_name,
      };
      const userUpdated = await authMgmtService.updateUser(userId, update);

      const data = {
        id: userUpdated?.email,
        email: userUpdated?.email,
        name: userUpdated?.name, // deprecated;
        firstName: userUpdated?.given_name,
        lastName: userUpdated?.family_name,
        pendingEmail: user?.user_metadata?.pendingUserEmail,
      };

      if (include.includes('groups')) {
        const groups = await authzService.getMemberGroups(userId, req.groups);
        set(data, 'groups', groups);
      }

      const code = 200;
      const response = createUserSerializer(include).serialize(data);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.post(
    `${path}/change-email`,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const include = queryParamGroup(<string>req.query.include);

      requireReqBodyKeys(req, ['email']);
      const { email } = req.body;

      validateEmail(email);
      const user = await authMgmtService.emailChangeRequest(req.identity.sub, email);

      const data = {
        id: user?.email,
        email: user?.email,
        name: user?.name, // deprecated;
        firstName: user?.given_name,
        lastName: user?.family_name,
        pendingEmail: user?.user_metadata?.pendingUserEmail,
      };

      const code = 200;
      const response = createUserSerializer(include).serialize(data);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.delete(
    `${path}/change-email`,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const include = queryParamGroup(<string>req.query.include);
      const user = await authMgmtService.emailChangeCancelRequest(req.identity.sub);

      const data = {
        id: user?.email,
        email: user?.email,
        name: user?.name, // deprecated;
        firstName: user?.given_name,
        lastName: user?.family_name,
        pendingEmail: user?.user_metadata?.pendingUserEmail,
      };

      const code = 200;
      const response = createUserSerializer(include).serialize(data);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.get(
    `${path}/change-email`,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      requireReqParamKeys(req, ['accessToken']);
      const accessToken = <string>req.query.accessToken;
      const tempUserInfo = await authMgmtService.getUserInfo(accessToken);

      const success = await authMgmtService.emailChangeConfirmationHook(req.identity.sub, tempUserInfo.sub);

      const code = 200;
      const response = createStatusSerializer().serialize({ success });

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.post(
    `${path}/change-password`,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const success = await authMgmtService.passwordChangeRequest(req.identity.sub);

      const code = 200;
      const response = createStatusSerializer().serialize({ success });

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  return router;
};

const getAdminRouter = (basePath: string = '/', routePath: string = '/management/users') => {
  const router: Router = Router();
  const path = urljoin(basePath, routePath);

  router.get(
    path,
    guard.enforcePrimaryGroup(true),
    AuthzGuards.readUsersGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzServiceSpec = req.app.locals.authzService;

      const include = queryParamGroup(<string>req.query.include);
      const pageNumber = get(req.query, 'page.number', 0);
      const pageSize = get(req.query, 'page.size', 25);

      const pageOptions = {
        page: Math.max(parseInt(<string>pageNumber), 1),
        size: Math.min(Math.max(parseInt(<string>pageSize), 0), 10),
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
      const authzService: AuthzServiceSpec = req.app.locals.authzService;

      const include = queryParamGroup(<string>req.query.include);

      const groupMembership = await authzService.calculateGroupMemberships(req.identity.sub);
      const groupId = authzService.findPrimaryGroupId(groupMembership, req.groups[0]); // enforce a single primary group;

      const isOwner = await authzService.isGroupOwner(req.identity.sub, groupId);
      const nestedGroups = await authzService.getNestedGroups(groupId, [], isOwner ? ['OWNER'] : ['OWNER', 'ADMIN']);

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
      const authzService: AuthzServiceSpec = req.app.locals.authzService;
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const email = req.params.email;
      const include = queryParamGroup(<string>req.query.include);

      validateEmail(email);
      const user = await authMgmtService.getUserByEmail(email);
      const userId = get(user, 'user_id');

      const groups = await authzService.getMemberGroups(userId, [req.groups[0]]); // enforce a single primary group;

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
      const authzService: AuthzServiceSpec = req.app.locals.authzService;
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const include = queryParamGroup(<string>req.query.include);

      requireReqBodyKeys(req, ['email', 'groups']);
      const { email, groups } = req.body;

      validateEmail(email);
      const user = await authMgmtService.getUserByEmail(email, false);
      if (user) {
        throw new AlreadyExistsError('Email address is already registered.', 400);
      }

      const groupMembership = await authzService.calculateGroupMemberships(req.identity.sub);
      const groupId = authzService.findPrimaryGroupId(groupMembership, req.groups[0]); // enforce a single primary group;

      const isOwner = await authzService.isGroupOwner(req.identity.sub, groupId);

      const nestedGroups = await authzService.getNestedGroups(groupId, [], isOwner ? ['OWNER'] : ['OWNER', 'ADMIN']);
      const available = nestedGroups.map((group: any) => get(group, '_id'));

      if (Array.isArray(groups) && !groups.every((r) => available.includes(r))) {
        throw new RecordNotFound('Invalid group specified.', 404);
      }

      const newUser = await authMgmtService.createUserInvite(email);
      const newUserId = get(newUser, 'user_id');

      await forEachAsync(nestedGroups, async (group: any) => {
        const groupId = get(group, '_id');
        const members = get(group, 'members', []);

        if (!members.includes(newUserId) && groups.includes(groupId)) {
          return authzService.addGroupMembers(groupId, [newUserId]); // add to group;
        }
      });

      const data = {
        id: newUser?.email,
        email: newUser?.email,
        name: newUser?.name, // deprecated;
        firstName: newUser?.given_name,
        lastName: newUser?.family_name,
        pendingEmail: newUser?.user_metadata?.pendingUserEmail,
      };

      if (include.includes('groups')) {
        const groups = await authzService.getMemberGroups(newUserId, req.groups);
        set(data, 'groups', groups);
      }

      const code = 200;
      const response = createUserSerializer(include).serialize(data);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.put(
    path,
    guard.enforcePrimaryGroup(true),
    AuthzGuards.writeUsersGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzServiceSpec = req.app.locals.authzService;
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const emails = get(req.body, 'emails', []);
      const groups = get(req.body, 'groups', []);

      const groupMembership = await authzService.calculateGroupMemberships(req.identity.sub);
      const groupId = authzService.findPrimaryGroupId(groupMembership, req.groups[0]); // enforce a single primary group;

      const isOwner = await authzService.isGroupOwner(req.identity.sub, groupId);

      const nestedGroups = await authzService.getNestedGroups(groupId, [], isOwner ? ['OWNER'] : ['OWNER', 'ADMIN']);
      const available = nestedGroups.map((group: any) => get(group, '_id'));

      if (!groups.every((r) => available.includes(r))) {
        throw new RecordNotFound('Invalid group specified.', 404);
      }

      const result: {
        email: string;
        success?: boolean;
        error?: string;
      }[] = [];

      const users = await forEachAsync(emails, async (email: string) => {
        try {
          validateEmail(email);
          const user = await authMgmtService.getUserByEmail(email);
          const userId = get(user, 'user_id');

          if (req.identity.sub === userId) {
            throw new UnauthorizedError('You cannot update your own user.', 403);
          }

          const [triesToUpdateAnAdmin, triesToUpdateAnOwner] = await forEachAsync(
            [authzService.isGroupAdmin(userId, groupId), authzService.isGroupOwner(userId, groupId)],
            (fn) => fn
          );

          if (triesToUpdateAnOwner) {
            throw new UnauthorizedError('You cannot update an owner.', 403);
          }

          if (triesToUpdateAnAdmin && !isOwner) {
            throw new UnauthorizedError('You cannot update an admin.', 403);
          }

          result.push({
            email: user.email,
          });

          return { email, userId };
        } catch (err) {
          result.push({
            email: email,
            error: err.message,
          });
        }
      });

      if (result.some((item) => !!item.error)) {
        return res.header('Content-Type', DEFAULT_CONTENT_TYPE).status(200).send(result);
      }

      const usersIds = users.map((user) => user.userId);

      await forEachAsync(nestedGroups, async (group: any) => {
        const groupId = get(group, '_id');
        const members = get(group, 'members', []);

        const toAdd = usersIds.filter((userId) => !members.includes(userId) && groups.includes(groupId));
        const toRemove = usersIds.filter((userId) => members.includes(userId) && !groups.includes(groupId));

        return forEachAsync(
          [
            toAdd.length > 0 ? authzService.addGroupMembers(groupId, toAdd) : null,
            toRemove.length > 0 ? authzService.deleteGroupMembers(groupId, toRemove) : null,
          ].filter((f) => f !== null),
          (fn) => fn
        );
      });

      result.forEach((item) => (item.success = true));

      res.header('Content-Type', DEFAULT_CONTENT_TYPE).status(200).send(result);
    })
  );

  router.put(
    `${path}/:email`,
    guard.enforcePrimaryGroup(true),
    AuthzGuards.writeUsersGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzServiceSpec = req.app.locals.authzService;
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const email = req.params.email;
      const body = req.body;

      validateEmail(email);
      const user = await authMgmtService.getUserByEmail(email);
      const userId = get(user, 'user_id');

      if (req.identity.sub === userId) {
        throw new UnauthorizedError('You cannot update your own user.', 403);
      }

      const groupMembership = await authzService.calculateGroupMemberships(req.identity.sub);
      const groupId = authzService.findPrimaryGroupId(groupMembership, req.groups[0]); // enforce a single primary group;

      const triesToUpdateAnOwner = await authzService.isGroupOwner(userId, groupId);
      if (triesToUpdateAnOwner) {
        throw new UnauthorizedError('You cannot update an owner.', 403);
      }

      const triesToUpdateAnAdmin = await authzService.isGroupAdmin(userId, groupId);
      const isOwner = await authzService.isGroupOwner(req.identity.sub, groupId);

      if (triesToUpdateAnAdmin && !isOwner) {
        throw new UnauthorizedError('You cannot update an admin.', 403);
      }

      const groups = get(body, 'groups', []);
      const nestedGroups = await authzService.getNestedGroups(groupId, [], isOwner ? ['OWNER'] : ['OWNER', 'ADMIN']);
      const available = nestedGroups.map((group: any) => get(group, '_id'));

      if (Array.isArray(groups) && !groups.every((r) => available.includes(r))) {
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
      const response = createStatusSerializer().serialize({ success });

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.delete(
    `${path}/:email`,
    guard.enforcePrimaryGroup(true),
    AuthzGuards.writeUsersGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzServiceSpec = req.app.locals.authzService;
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const email = req.params.email;

      validateEmail(email);
      const user = await authMgmtService.getUserByEmail(email);
      const userId = get(user, 'user_id');

      if (req.identity.sub === userId) {
        throw new UnauthorizedError('You cannot delete your own user.', 403);
      }

      const groupMembership = await authzService.calculateGroupMemberships(req.identity.sub);
      const groupId = authzService.findPrimaryGroupId(groupMembership, req.groups[0]); // enforce a single primary group;

      const triesToDeleteAnOwner = await authzService.isGroupOwner(userId, groupId);
      if (triesToDeleteAnOwner) {
        throw new UnauthorizedError('You cannot delete an owner.', 403);
      }

      const triesToDeleteAnAdmin = await authzService.isGroupAdmin(userId, groupId);
      const isOwner = await authzService.isGroupOwner(req.identity.sub, groupId);

      if (triesToDeleteAnAdmin && !isOwner) {
        throw new UnauthorizedError('You need to be an owner to delete an admin', 403);
      }

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
      const response = createStatusSerializer().serialize({ success });

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  return router;
};

export default { getProfileRouter, getAdminRouter };
