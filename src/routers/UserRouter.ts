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
import { AlreadyExistsError, RecordNotFound, UnauthorizedError } from '../errors';
import { PaginationHelper } from '../helpers/paginator';
import { forEachAsync } from '../helpers/util';
import { getLogger } from '../logging';
import { AuthzGuards, AuthzRequest, guard } from '../middlewares/authz-guards';
import { createSerializer as createGroupSerializer } from '../serializers/GroupRoleSerializer';
import { createSerializer as createStatusSerializer } from '../serializers/StatusSerializer';
import {
  createBulkSerializer as createUserBulkSerializer,
  createSerializer as createUserSerializer,
} from '../serializers/UserSerializer';
import { AuthzServiceSpec } from '../services/auth0-authz';
import { AuthManagementService } from '../services/auth0-management';
import { ResponseMeta } from '../types/response';

import { queryParamGroup, validate } from '.';

const logger = getLogger();

const getProfileRouter = (basePath: string = '/', routePath: string = '/users/profile') => {
  const router: Router = Router();
  const path = urljoin(basePath, routePath);

  router.get(
    path,
    validate([query('include').optional().isString().trim()]),
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
    validate([
      query('include').optional().isString().trim(),
      body('firstName').optional().isString().trim().notEmpty(),
      body('lastName').optional().isString().trim().notEmpty(),
    ]),
    guard.includeGroups(),
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzServiceSpec = req.app.locals.authzService;
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const include = queryParamGroup(<string>req.query.include);

      const user = await authMgmtService.getUser(req.identity.sub);
      const userId = get(user, 'user_id');

      const firstName = get(req.body, 'firstName', user?.given_name);
      const lastName = get(req.body, 'lastName', user?.family_name);

      const update = {
        given_name: firstName,
        family_name: lastName,
        name: `${firstName} ${lastName}`,
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

  router.delete(
    path,
    validate([]),
    guard.includeGroups(),
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzServiceSpec = req.app.locals.authzService;
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const userId = req.identity.sub;
      const groupMembership = await authzService.calculateGroupMemberships(userId);

      const availableGroups = req.groups.filter((group: any) => groupMembership.find((g: any) => g.name === group));

      // check if it's the only owner of a group;
      await forEachAsync(availableGroups, async (group) => {
        const groupId = authzService.findPrimaryGroupId(groupMembership, group);
        const groupOwners = await authzService.getGroupOwners(groupId, true);

        if (groupOwners.includes(userId) && groupOwners.length === 1) {
          throw new UnauthorizedError(`You cannot delete your account because you're the only owner of ${group}.`, 403);
        }
      });

      // check if it's the only super admin;
      const superAdmins = await authzService.getSuperAdmins(true);

      if (superAdmins.includes(userId) && superAdmins.length === 1) {
        throw new UnauthorizedError(`You cannot delete your account because you're the only super admin.`, 403);
      }

      let success, code;
      try {
        // remove from all groups;
        await forEachAsync(availableGroups, async (group) => {
          const groupId = authzService.findPrimaryGroupId(groupMembership, group);

          const nestedGroups = await authzService.getNestedGroups(groupId);
          const availableNestedGroups = nestedGroups.filter((group: any) =>
            groupMembership.find((g: any) => g._id === group._id)
          );

          return Promise.all(
            availableNestedGroups.map((group: any) => authzService.deleteGroupMembers(groupId, group._id, [userId]))
          );
        });

        // delete user;
        await authMgmtService.deleteUser(userId);

        success = true;
        code = 200;
      } catch (err) {
        logger.error(err);

        success = false;
        code = 418;
      }

      const response = createStatusSerializer().serialize({ success });

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.post(
    `${path}/change-email`,
    validate([query('include').optional().isString().trim(), body('email').trim().isEmail()]),
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const include = queryParamGroup(<string>req.query.include);

      const { email } = req.body;

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
    validate([query('include').optional().isString().trim()]),
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
    validate([query('accessToken').isString().trim().notEmpty()]),
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

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
    validate([]),
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const success = await authMgmtService.passwordChangeRequest(req.identity.sub);

      const code = 200;
      const response = createStatusSerializer().serialize({ success });

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.post(
    `${path}/verify-email`,
    validate([]),
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const user = await authMgmtService.getUser(req.identity.sub);
      const userId = get(user, 'user_id');
      const emailVerified = get(user, 'email_verified');

      if (emailVerified) {
        throw new AlreadyExistsError('Email address is already verified.', 400);
      }
      const success = await authMgmtService.sendEmailVerification(userId);

      const code = 200;
      const response = createStatusSerializer().serialize({ success });

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.post(
    `${path}/organizations`,
    validate([]),
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzServiceSpec = req.app.locals.authzService;

      const organizations = req.body;

      const userId = req.identity.sub;
      const groupMembership = await authzService.calculateGroupMemberships(userId);

      const errors: { code: number; detail: string }[] = [];
      const groupsToLeave: { [key: string]: any } = {};

      await forEachAsync(organizations, async (org) => {
        const groupId = authzService.findPrimaryGroupId(groupMembership, org);

        const nestedGroups = await authzService.getNestedGroups(groupId);
        const availableNestedGroups = nestedGroups.filter((group: any) =>
          groupMembership.find((g: any) => g._id === group._id)
        );

        if (availableNestedGroups.find((group: any) => group.name.endsWith('OWNER') && group.members.length === 1)) {
          errors.push({
            code: 400,
            detail: `You can't leave ${org} because you're the only owner of it.`,
          });
        } else {
          groupsToLeave[groupId] = availableNestedGroups;
        }
      });

      if (errors.length > 0) {
        const code = 400;
        const response = createStatusSerializer().serialize({ success: false, errors });

        res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
        return res.status(code).send(response);
      }

      let success = true;
      try {
        const tasks = Object.entries(groupsToLeave).map(([groupId, nested]) =>
          nested.map((group: any) => authzService.deleteGroupMembers(groupId, group._id, [userId]))
        );
        await Promise.all(tasks);
      } catch (err) {
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

const getAdminRouter = (basePath: string = '/', routePath: string = '/management/users') => {
  const router: Router = Router();
  const path = urljoin(basePath, routePath);

  router.get(
    path,
    validate([
      query('include').optional().isString().trim(),
      query('page[number]').optional().isInt({ min: 0 }),
      query('page[size]').optional().isInt({ min: 0 }),
      query('group').optional().isString().trim(),
    ]),
    guard.enforcePrimaryGroup({ serviceAccounts: true }),
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
    validate([query('include').optional().isString().trim(), query('group').optional().isString().trim()]),
    guard.enforcePrimaryGroup({ serviceAccounts: true }),
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
    validate([
      param('email').trim().isEmail(),
      query('include').optional().isString().trim(),
      query('group').optional().isString().trim(),
    ]),
    guard.enforcePrimaryGroup({ serviceAccounts: true }),
    AuthzGuards.readUsersGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzServiceSpec = req.app.locals.authzService;
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const email = req.params.email;
      const include = queryParamGroup(<string>req.query.include);

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
    validate([
      body('email').trim().isEmail(),
      body('groups').isArray(),
      body('groups.*').isString().trim().notEmpty(),
      query('include').optional().isString().trim(),
      query('group').optional().isString().trim(),
    ]),
    guard.enforcePrimaryGroup({ serviceAccounts: true }),
    AuthzGuards.writeUsersGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzServiceSpec = req.app.locals.authzService;
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const include = queryParamGroup(<string>req.query.include);

      const { email, groups } = req.body;

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
        throw new RecordNotFound('Invalid groups specified.', 404);
      }

      const newUser = await authMgmtService.createUserInvite(email);
      const newUserId = get(newUser, 'user_id');

      await forEachAsync(nestedGroups, async (group: any) => {
        const nestedId = get(group, '_id');
        const members = get(group, 'members', []);

        if (!members.includes(newUserId) && groups.includes(nestedId)) {
          return authzService.addGroupMembers(groupId, nestedId, [newUserId]); // add to group;
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
    validate([
      body('emails').isArray(),
      body('emails.*').trim().isEmail(),
      body('groups').isArray(),
      body('groups.*').isString().trim().notEmpty(),
      query('group').optional().isString().trim(),
    ]),
    guard.enforcePrimaryGroup({ serviceAccounts: true }),
    AuthzGuards.writeUsersGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzServiceSpec = req.app.locals.authzService;
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const emails: string[] = get(req.body, 'emails', []);
      const groups: string[] = get(req.body, 'groups', []);

      const groupMembership = await authzService.calculateGroupMemberships(req.identity.sub);
      const groupId = authzService.findPrimaryGroupId(groupMembership, req.groups[0]); // enforce a single primary group;

      const isOwner = await authzService.isGroupOwner(req.identity.sub, groupId);
      const nestedGroups = await authzService.getNestedGroups(groupId, [], isOwner ? ['OWNER'] : ['OWNER', 'ADMIN']);
      const available = nestedGroups.map((group: any) => get(group, '_id'));

      if (!groups.every((r) => available.includes(r))) {
        throw new RecordNotFound('Invalid groups specified.', 404);
      }

      const data: { email: string; error?: string; status?: number }[] = [];

      const existingUserIds = [...new Set(nestedGroups.map((group) => get(group, 'members', [])).flat())];
      const uniqueEmails = new Set(emails);

      const userIds = compact(
        await forEachAsync([...uniqueEmails], async (email: string) => {
          try {
            const user = await authMgmtService.getUserByEmail(email);
            const userId = get(user, 'user_id');

            if (existingUserIds.includes(userId)) {
              throw new AlreadyExistsError('The user already exists.', 409); // 409 Conflict;
            }
            if (req.identity.sub === userId) {
              throw new UnauthorizedError('You cannot update your own user.', 403);
            }

            const [triesToUpdateAnAdmin, triesToUpdateAnOwner] = await Promise.all([
              authzService.isGroupAdmin(userId, groupId),
              authzService.isGroupOwner(userId, groupId),
            ]);
            if (triesToUpdateAnOwner) {
              throw new UnauthorizedError('You cannot update an owner.', 403);
            }
            if (triesToUpdateAnAdmin && !isOwner) {
              throw new UnauthorizedError('You cannot update an admin.', 403);
            }

            data.push({ email: user.email, status: 200 });

            return userId;
          } catch (err) {
            data.push({ email: email, error: err.message, status: err.code });
          }
        })
      );

      if (data.some((res) => ![200, 409].includes(res.status))) {
        const code = 400;
        const response = createUserBulkSerializer().serialize(data);

        res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
        return res.status(code).send(response);
      }

      await forEachAsync(nestedGroups, async (group: any) => {
        const nestedId = get(group, '_id');
        const members = get(group, 'members', []);

        const toAdd = userIds.filter((userId) => !members.includes(userId) && groups.includes(nestedId));
        const toRemove = userIds.filter((userId) => members.includes(userId) && !groups.includes(nestedId));

        const tasks = [];
        if (toAdd.length) {
          tasks.push(authzService.addGroupMembers(groupId, nestedId, toAdd)); // add to group;
        }
        if (toRemove.length) {
          tasks.push(authzService.deleteGroupMembers(groupId, nestedId, toRemove)); // remove from group;
        }
        return Promise.all(tasks);
      });

      const code = 200;
      const response = createUserBulkSerializer().serialize(data);

      res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      res.status(code).send(response);
    })
  );

  router.put(
    `${path}/:email`,
    validate([
      param('email').trim().isEmail(),
      body('groups').isArray(),
      body('groups.*').isString().trim().notEmpty(),
      query('group').optional().isString().trim(),
    ]),
    guard.enforcePrimaryGroup({ serviceAccounts: true }),
    AuthzGuards.writeUsersGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzServiceSpec = req.app.locals.authzService;
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const email: string = req.params.email;
      const groups: string[] = get(req.body, 'groups', []);

      const user = await authMgmtService.getUserByEmail(email);
      const userId = get(user, 'user_id');

      if (req.identity.sub === userId) {
        throw new UnauthorizedError('You cannot update your own user.', 403);
      }

      const groupMembership = await authzService.calculateGroupMemberships(req.identity.sub);
      const groupId = authzService.findPrimaryGroupId(groupMembership, req.groups[0]); // enforce a single primary group;

      const [triesToUpdateAnOwner, triesToUpdateAnAdmin, isOwner] = await Promise.all([
        authzService.isGroupOwner(userId, groupId),
        authzService.isGroupAdmin(userId, groupId),
        authzService.isGroupOwner(req.identity.sub, groupId),
      ]);
      if (triesToUpdateAnOwner) {
        throw new UnauthorizedError('You cannot update an owner.', 403);
      }
      if (triesToUpdateAnAdmin && !isOwner) {
        throw new UnauthorizedError('You cannot update an admin.', 403);
      }

      const nestedGroups = await authzService.getNestedGroups(groupId, [], isOwner ? ['OWNER'] : ['OWNER', 'ADMIN']);
      const available = nestedGroups.map((group: any) => get(group, '_id'));

      if (Array.isArray(groups) && !groups.every((r) => available.includes(r))) {
        throw new RecordNotFound('Invalid groups specified.', 404);
      }

      const responses = await forEachAsync(nestedGroups, async (group: any) => {
        const nestedId = get(group, '_id');
        const members = get(group, 'members', []);

        if (!members.includes(userId) && groups.includes(nestedId)) {
          return authzService.addGroupMembers(groupId, nestedId, [userId]); // add to group;
        }
        if (members.includes(userId) && !groups.includes(nestedId)) {
          return authzService.deleteGroupMembers(groupId, nestedId, [userId]); // remove from group;
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
    validate([param('email').trim().isEmail(), query('group').optional().isString().trim()]),
    guard.enforcePrimaryGroup({ serviceAccounts: true }),
    AuthzGuards.writeUsersGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzServiceSpec = req.app.locals.authzService;
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const email = req.params.email;

      const user = await authMgmtService.getUserByEmail(email);
      const userId = get(user, 'user_id');

      if (req.identity.sub === userId) {
        throw new UnauthorizedError('You cannot delete your own user.', 403);
      }

      const groupMembership = await authzService.calculateGroupMemberships(req.identity.sub);
      const groupId = authzService.findPrimaryGroupId(groupMembership, req.groups[0]); // enforce a single primary group;

      const [triesToDeleteAnOwner, triesToDeleteAnAdmin, isOwner] = await Promise.all([
        authzService.isGroupOwner(userId, groupId),
        authzService.isGroupAdmin(userId, groupId),
        authzService.isGroupOwner(req.identity.sub, groupId),
      ]);
      if (triesToDeleteAnOwner) {
        throw new UnauthorizedError('You cannot delete an owner.', 403);
      }
      if (triesToDeleteAnAdmin && !isOwner) {
        throw new UnauthorizedError('You need to be an owner to delete an admin', 403);
      }

      const nestedGroups = await authzService.getNestedGroups(groupId);

      const responses = await forEachAsync(nestedGroups, async (group: any) => {
        const members = get(group, 'members', []);

        if (members.includes(userId)) {
          const nestedId = get(group, '_id');
          return authzService.deleteGroupMembers(groupId, nestedId, [userId]);
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
