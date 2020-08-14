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

import { get } from 'lodash';

import { AUTH0_APPLICATION_CLIENT_ID } from '../config/auth0';
import { AlreadyExistsError } from '../errors';
import { forEachAsync } from '../helpers/util';
import { getLogger } from '../logging';
import { ScopesEnum } from '../middlewares/authz-guards';

import { AuthzServiceSpec } from './auth0-authz';

const logger = getLogger('membership-service');

enum RoleEnum {
  OWNER = 'Owner',
  ADMIN = 'Admin',
  EDITOR = 'Editor',
  VIEWER = 'Viewer',
  SUPER_ADMIN = 'SuperAdmin',
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
];
const SCOPES_READ_SUPER_ADMIN = [ScopesEnum.ReadOrganizations];
const SCOPES_READ_DESCRIPTION = 'Provides the ability to read data from a specific resource inside an organization.';
const SCOPES_READ_SUPER_ADMIN_DESCRIPTION = 'Provides read-only access for administrative tasks.';

const SCOPES_WRITE = [
  ScopesEnum.WriteAll,
  ScopesEnum.WriteLocations,
  ScopesEnum.WriteMetrics,
  ScopesEnum.WriteCollections,
  ScopesEnum.WriteLayers,
  ScopesEnum.WriteWidgets,
  ScopesEnum.WriteDashboards,
  ScopesEnum.WriteUsers,
];
const SCOPES_WRITE_SUPER_ADMIN = [ScopesEnum.WriteOrganizations];
const SCOPES_WRITE_DESCRIPTION = 'Provides the ability to modify data on a specific resource inside an organization.';
const SCOPES_WRITE_SUPER_ADMIN_DESCRIPTION = 'Provides the ability to perform administrative tasks.';

type PermissionType = { name: string; readScopes: ScopesEnum[]; writeScopes: ScopesEnum[]; description: string };

const ROLES: { [key in RoleEnum]?: PermissionType } = {
  [RoleEnum.OWNER]: {
    name: RoleEnum.OWNER,
    readScopes: [ScopesEnum.ReadAll],
    writeScopes: [ScopesEnum.WriteAll],
    description: 'Complete power over the assets managed by an organization.',
  },
  [RoleEnum.ADMIN]: {
    name: RoleEnum.ADMIN,
    readScopes: [ScopesEnum.ReadAll],
    writeScopes: [ScopesEnum.WriteAll],
    description: 'Power over the assets managed by an organization.',
  },
  [RoleEnum.EDITOR]: {
    name: RoleEnum.EDITOR,
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
  [RoleEnum.VIEWER]: {
    name: RoleEnum.VIEWER,
    readScopes: [
      ScopesEnum.ReadLocations,
      ScopesEnum.ReadMetrics,
      ScopesEnum.ReadCollections,
      ScopesEnum.ReadLayers,
      ScopesEnum.ReadWidgets,
      ScopesEnum.ReadDashboards,
    ],
    writeScopes: [],
    description: 'Can view content managed by the organization.',
  },
  [RoleEnum.SUPER_ADMIN]: {
    name: RoleEnum.SUPER_ADMIN,
    readScopes: [ScopesEnum.ReadOrganizations],
    writeScopes: [ScopesEnum.WriteOrganizations],
    description: 'Manage system assets outside of an organization scope.',
  },
};

export interface MembershipServiceSpec {
  createOrganization(name: string, description: string, ownerIds: string[], applicationId?: string): Promise<void>;
  deleteOrganization(id: string): Promise<boolean>;
  createSuperAdmin(): Promise<boolean>;
}

export class MembershipService implements MembershipServiceSpec {
  constructor(private authzService: AuthzServiceSpec) {}

  /**
   * Creates all resources required by an organization: groups, nested groups, roles and permissions.
   * @param name
   * @param description
   * @param ownerIds
   * @param applicationId
   */
  async createOrganization(
    name: string,
    description: string,
    ownerIds: string[],
    applicationId: string = AUTH0_APPLICATION_CLIENT_ID
  ) {
    const rootPrefix = name.trim().toUpperCase();

    // create the main group, fail if name already exists;
    let main;
    try {
      main = await this.authzService.createGroup(rootPrefix, description);
    } catch (err) {
      throw new AlreadyExistsError('An organization with the same name already exists.', 400);
    }

    // create the nested groups;
    const [viewer, editor, admin, owner] = await forEachAsync(
      [RoleEnum.VIEWER, RoleEnum.EDITOR, RoleEnum.ADMIN, RoleEnum.OWNER],
      async (roleType) => {
        const name = [rootPrefix, roleType.toUpperCase()].join('-');
        const description = [rootPrefix, roleType].join(' ');

        return this.authzService.createGroup(name, description);
      }
    );

    // add nested groups (children) to the main group;
    await this.authzService.addNestedGroups(main._id, [viewer._id, editor._id, admin._id, owner._id]);

    const permissionMap: { [key in ScopesEnum]?: string } = {};

    // create permissions;
    await Promise.all([
      ...SCOPES_READ.map((scope) => {
        const read = [rootPrefix, scope].join(':');
        return this.authzService.createPermission(read, SCOPES_READ_DESCRIPTION, applicationId).then((perm) => {
          permissionMap[scope] = perm._id;
        });
      }),
      ...SCOPES_WRITE.map((scope) => {
        const write = [rootPrefix, scope].join(':');
        return this.authzService.createPermission(write, SCOPES_WRITE_DESCRIPTION, applicationId).then((perm) => {
          permissionMap[scope] = perm._id;
        });
      }),
    ]);

    // create roles;
    const [viewerRole, editorRole, adminRole, ownerRole] = await forEachAsync(
      [RoleEnum.VIEWER, RoleEnum.EDITOR, RoleEnum.ADMIN, RoleEnum.OWNER],
      async (roleType) => {
        const name = [rootPrefix, ROLES[roleType].name].join('-');

        return this.authzService.createRole(name, ROLES[roleType].description, AUTH0_APPLICATION_CLIENT_ID, [
          ...ROLES[roleType].readScopes.map((scope) => permissionMap[scope]),
          ...ROLES[roleType].writeScopes.map((scope) => permissionMap[scope]),
        ]);
      }
    );

    // add the roles for each of the nested groups;
    await Promise.all([
      this.authzService.addGroupRoles(viewer._id, [viewerRole._id]),
      this.authzService.addGroupRoles(editor._id, [editorRole._id]),
      this.authzService.addGroupRoles(admin._id, [adminRole._id]),
      this.authzService.addGroupRoles(owner._id, [ownerRole._id]),
    ]);

    // set the owners;
    await this.authzService.addGroupMembers(owner._id, ownerIds);

    return main;
  }

  /**
   * Deletes all resources required by an organization: groups, nested groups, roles and permissions.
   * @param groupId: primary group ID
   */
  async deleteOrganization(groupId: string): Promise<boolean> {
    let success = true;
    try {
      const nestedGroups = await this.authzService.getNestedGroups(groupId);
      const nestedGroupIds = nestedGroups.map((ng) => ng._id);

      if (!nestedGroupIds.length) {
        throw new Error(`No nested groups found for: ${groupId}`);
      }

      logger.debug(`detaching nested groups: ${nestedGroupIds.join(', ')}`);
      await this.authzService.deleteNestedGroups(groupId, nestedGroupIds);

      const roleIds = [];
      const permissionIds = [];

      // remove nested groups;
      await forEachAsync(nestedGroupIds, async (nestedGroupId) => {
        const groupRoles = await this.authzService.getNestedGroupRoles(nestedGroupId);

        groupRoles.forEach((groupRole) => {
          const roleId = get(groupRole, 'role._id');
          const permissions = get(groupRole, 'role.permissions', []);

          roleIds.push(roleId);
          permissionIds.push(...permissions);
        });

        logger.debug(`removing nested group: ${nestedGroupId}`);
        await this.authzService.deleteGroup(nestedGroupId);
      });

      // remove roles;
      await forEachAsync(roleIds, async (roleId) => {
        logger.debug(`removing role: ${roleId}`);
        await this.authzService.deleteRole(roleId);
      });

      // remove roles & permissions;
      await forEachAsync(permissionIds, async (permId) => {
        logger.debug(`removing permission: ${permId}`);
        await this.authzService.deletePermission(permId);
      });

      // delete main group;
      await this.authzService.deleteGroup(groupId);
    } catch (err) {
      logger.error(err);
      success = false;
    }
    return success;
  }

  /**
   * Bootstrap SuperAdmin role and permissions.
   * @param applicationId
   */
  async createSuperAdmin(applicationId: string = AUTH0_APPLICATION_CLIENT_ID): Promise<any> {
    const rootPrefix = '*';
    const roleName = [rootPrefix, ROLES.SuperAdmin.name].join('-');

    const permissionMap: { [key in ScopesEnum]?: string } = {};

    // create permissions;
    await Promise.all([
      ...SCOPES_READ_SUPER_ADMIN.map((scope) => {
        const read = [rootPrefix, scope].join(':');
        return this.authzService
          .createPermission(read, SCOPES_READ_SUPER_ADMIN_DESCRIPTION, applicationId)
          .then((perm) => {
            permissionMap[scope] = perm._id;
          });
      }),
      ...SCOPES_WRITE_SUPER_ADMIN.map((scope) => {
        const write = [rootPrefix, scope].join(':');
        return this.authzService
          .createPermission(write, SCOPES_WRITE_SUPER_ADMIN_DESCRIPTION, applicationId)
          .then((perm) => {
            permissionMap[scope] = perm._id;
          });
      }),
    ]);

    // create roles;
    await this.authzService.createRole(roleName, ROLES.SuperAdmin.description, AUTH0_APPLICATION_CLIENT_ID, [
      ...ROLES.SuperAdmin.readScopes.map((scope) => permissionMap[scope]),
      ...ROLES.SuperAdmin.writeScopes.map((scope) => permissionMap[scope]),
    ]);
  }
}
