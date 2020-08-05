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
import { AUTH0_APPLICATION_CLIENT_ID } from '../config/auth0';
import { PaginationHelper } from '../helpers/paginator';
import { forEachAsync } from '../helpers/util';
import { getLogger } from '../logging';
import { AuthzGuards, AuthzRequest, guard, ScopesEnum } from '../middlewares/authz-guards';
import { createSerializer as createOrganizationSerializer } from '../serializers/OrganizationSerializer';
import { AuthzService } from '../services/auth0-authz';
import { AuthManagementService } from '../services/auth0-management';
import { ResponseMeta, SuccessResponse } from '../types/response';
import { UserNotFoundError, ParameterRequiredError } from '../errors';

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

  router.post(
    path,
    guard.enforcePrimaryGroup(true),
    AuthzGuards.writeOrganizationsGuard,
    asyncHandler(async (req: AuthzRequest, res: Response) => {
      const authzService: AuthzService = req.app.locals.authzService;
      const authMgmtService: AuthManagementService = req.app.locals.authManagementService;

      const { name, description, owners } = req.body;

      const groupName = name.trim().toUpperCase();
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

      const ownerEmail = owners[0];

      const user = await authMgmtService.getUserByEmail(ownerEmail);

      if (!user) {
        throw new UserNotFoundError('Invalid owner specified.', 404);
      }

      const SCOPES_READ = [
        ScopesEnum.ReadAll,
        ScopesEnum.ReadLocations,
        ScopesEnum.ReadMetrics,
        ScopesEnum.ReadCollections,
        ScopesEnum.ReadLayers,
        ScopesEnum.ReadWidgets,
        ScopesEnum.ReadDashboards,
        ScopesEnum.ReadUsers,
        ScopesEnum.ReadOrganizations,
      ];
      const SCOPES_READ_DESCRIPTION = 'Reading the full information about a single resource inside an organization.';

      const SCOPES_WRITE = [
        ScopesEnum.WriteAll,
        ScopesEnum.WriteLocations,
        ScopesEnum.WriteMetrics,
        ScopesEnum.WriteCollections,
        ScopesEnum.WriteLayers,
        ScopesEnum.WriteWidgets,
        ScopesEnum.WriteDashboards,
        ScopesEnum.WriteUsers,
        ScopesEnum.WriteOrganizations,
      ];
      const SCOPES_WRITE_DESCRIPTION =
        'Modifying the resource in any way e.g. creating, editing, or deleting inside an organization.';

      type Permission = { name: string; readScopes: string[]; writeScopes: string[]; description: string };

      const PERMISSIONS: { [key: string]: Permission } = {
        owner: {
          name: 'Owner',
          readScopes: [ScopesEnum.ReadAll],
          writeScopes: [ScopesEnum.WriteAll],
          description: 'Complete power over the assets managed by an organization.',
        },
        admin: {
          name: 'Admin',
          readScopes: [ScopesEnum.ReadAll],
          writeScopes: [ScopesEnum.WriteAll],
          description: 'Power over the assets managed by an organization.',
        },
        editor: {
          name: 'Editor',
          readScopes: [
            ScopesEnum.ReadLocations,
            ScopesEnum.ReadMetrics,
            ScopesEnum.ReadCollections,
            ScopesEnum.ReadLayers,
            ScopesEnum.ReadWidgets,
            ScopesEnum.ReadDashboards,
          ],
          writeScopes: [
            ScopesEnum.WriteLocations,
            ScopesEnum.WriteMetrics,
            ScopesEnum.WriteCollections,
            ScopesEnum.WriteLayers,
            ScopesEnum.WriteWidgets,
            ScopesEnum.WriteDashboards,
          ],
          description: 'Full content permission across the entire organization.',
        },
        viewer: {
          name: 'Viewer',
          readScopes: [
            ScopesEnum.ReadLocations,
            ScopesEnum.ReadMetrics,
            ScopesEnum.ReadCollections,
            ScopesEnum.ReadLayers,
            ScopesEnum.ReadWidgets,
            ScopesEnum.ReadDashboards,
          ],
          writeScopes: [],
          description: 'Can view content managed by the organization',
        },
      };

      const viewerGroupName = [groupName, 'VIEWER'].join('-');
      const editorGroupName = [groupName, 'EDITOR'].join('-');
      const adminGroupName = [groupName, 'ADMIN'].join('-');
      const ownerGroupName = [groupName, 'OWNER'].join('-');

      // create the main group + nested groups;
      const root = await authzService.createGroup(groupName, groupDescription);
      const owner = await authzService.createGroup(ownerGroupName, `${groupName} Owner`);
      const admin = await authzService.createGroup(adminGroupName, `${groupName} Admin`);
      const editor = await authzService.createGroup(editorGroupName, `${groupName} Editor`);
      const viewer = await authzService.createGroup(viewerGroupName, `${groupName} Viewer`);

      // add the nested groups under the main group;
      await authzService.addNestedGroups(root._id, [viewer._id, editor._id, admin._id, owner._id]);

      const permissionMap: { [key: string]: string } = {};

      // create permissions;
      await forEachAsync(SCOPES_READ, async (scope) => {
        const read = [groupName, scope].join(':');
        const permission = await authzService.createPermission(
          read,
          SCOPES_READ_DESCRIPTION,
          AUTH0_APPLICATION_CLIENT_ID
        );
        permissionMap[scope] = permission._id;
      });
      await forEachAsync(SCOPES_WRITE, async (scope) => {
        const write = [groupName, scope].join(':');
        const permission = await authzService.createPermission(
          write,
          SCOPES_WRITE_DESCRIPTION,
          AUTH0_APPLICATION_CLIENT_ID
        );
        permissionMap[scope] = permission._id;
      });

      // create roles;
      const viewerName = [groupName, PERMISSIONS.viewer.name].join(':');
      const viewerRole = await authzService.createRole(
        viewerName,
        PERMISSIONS.viewer.description,
        AUTH0_APPLICATION_CLIENT_ID,
        [
          ...PERMISSIONS.viewer.readScopes.map((scope) => permissionMap[scope]),
          ...PERMISSIONS.viewer.writeScopes.map((scope) => permissionMap[scope]),
        ]
      );
      const editorName = [groupName, PERMISSIONS.editor.name].join(':');
      const editorRole = await authzService.createRole(
        editorName,
        PERMISSIONS.editor.description,
        AUTH0_APPLICATION_CLIENT_ID,
        [
          ...PERMISSIONS.editor.readScopes.map((scope) => permissionMap[scope]),
          ...PERMISSIONS.editor.writeScopes.map((scope) => permissionMap[scope]),
        ]
      );
      const adminName = [groupName, PERMISSIONS.admin.name].join(':');
      const adminRole = await authzService.createRole(
        adminName,
        PERMISSIONS.admin.description,
        AUTH0_APPLICATION_CLIENT_ID,
        [
          ...PERMISSIONS.admin.readScopes.map((scope) => permissionMap[scope]),
          ...PERMISSIONS.admin.writeScopes.map((scope) => permissionMap[scope]),
        ]
      );
      const ownerName = [groupName, PERMISSIONS.owner.name].join(':');
      const ownerRole = await authzService.createRole(
        ownerName,
        PERMISSIONS.owner.description,
        AUTH0_APPLICATION_CLIENT_ID,
        [
          ...PERMISSIONS.owner.readScopes.map((scope) => permissionMap[scope]),
          ...PERMISSIONS.owner.writeScopes.map((scope) => permissionMap[scope]),
        ]
      );

      // add the roles for each of the nested groups;
      await authzService.addGroupRoles(viewer._id, [viewerRole._id]);
      await authzService.addGroupRoles(editor._id, [editorRole._id]);
      await authzService.addGroupRoles(admin._id, [adminRole._id]);
      await authzService.addGroupRoles(owner._id, [ownerRole._id]);

      // set owner;
      await authzService.addGroupMembers(owner._id, [user.user_id]);

      const code = 200;
      const response: SuccessResponse = { code, data: { success: true } };

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
