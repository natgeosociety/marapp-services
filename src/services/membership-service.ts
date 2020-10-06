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
import { AlreadyExistsError, RecordNotFound } from '../errors';
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
  ScopesEnum.ReadStats,
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
    readScopes: [ScopesEnum.ReadAll, ScopesEnum.ReadUsers],
    writeScopes: [ScopesEnum.WriteAll, ScopesEnum.WriteUsers],
    description: 'Complete power over the assets managed by an organization.',
  },
  [RoleEnum.ADMIN]: {
    name: RoleEnum.ADMIN,
    readScopes: [ScopesEnum.ReadAll, ScopesEnum.ReadUsers],
    writeScopes: [ScopesEnum.WriteAll, ScopesEnum.WriteUsers],
    description: 'Power over the assets managed by an organization.',
  },
  [RoleEnum.EDITOR]: {
    name: RoleEnum.EDITOR,
    readScopes: [ScopesEnum.ReadAll],
    writeScopes: [ScopesEnum.WriteAll],
    description: 'Full content permission across the entire organization.',
  },
  [RoleEnum.VIEWER]: {
    name: RoleEnum.VIEWER,
    readScopes: [ScopesEnum.ReadAll],
    writeScopes: [],
    description: 'Can view content managed by the organization.',
  },
};

const ROLES_NO_ORG: { [key in RoleEnum]?: PermissionType } = {
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
  createSuperAdmin(applicationId?: string): Promise<boolean>;
  updateOrganizationConfig(applicationId?: string): Promise<boolean>;
  enforceOrganizationName(value: string): boolean;
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
    const nameClean = name.trim();
    const descriptionClean = description.trim();

    // create the main group, fail if name already exists;
    let main;
    try {
      main = await this.authzService.createGroup(nameClean, descriptionClean);
    } catch (err) {
      throw new AlreadyExistsError('An organization with the same name already exists.', 400);
    }

    // create the nested groups;
    const [viewer, editor, admin, owner] = await forEachAsync(
      [RoleEnum.VIEWER, RoleEnum.EDITOR, RoleEnum.ADMIN, RoleEnum.OWNER],
      async (roleType) => {
        const name = [nameClean, roleType.toUpperCase()].join('-');
        const description = [nameClean, roleType].join(' ');

        return this.authzService.createGroup(name, description);
      }
    );

    // add nested groups (children) to the main group;
    await this.authzService.addNestedGroups(main._id, [viewer._id, editor._id, admin._id, owner._id]);

    const permissionMap: { [key in ScopesEnum]?: string } = {};

    // create permissions;
    await Promise.all([
      ...SCOPES_READ.map((scope) => {
        const read = [nameClean, scope].join(':');
        return this.authzService.createPermission(read, SCOPES_READ_DESCRIPTION, applicationId).then((perm) => {
          permissionMap[scope] = perm._id;
        });
      }),
      ...SCOPES_WRITE.map((scope) => {
        const write = [nameClean, scope].join(':');
        return this.authzService.createPermission(write, SCOPES_WRITE_DESCRIPTION, applicationId).then((perm) => {
          permissionMap[scope] = perm._id;
        });
      }),
    ]);

    // create roles;
    const [viewerRole, editorRole, adminRole, ownerRole] = await forEachAsync(
      [RoleEnum.VIEWER, RoleEnum.EDITOR, RoleEnum.ADMIN, RoleEnum.OWNER],
      async (roleType) => {
        const name = [nameClean, ROLES[roleType].name].join(':');

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
   * @param applicationId:
   */
  async deleteOrganization(groupId: string, applicationId: string = AUTH0_APPLICATION_CLIENT_ID): Promise<boolean> {
    const group = await this.authzService.getGroup(groupId);
    if (!group) {
      throw new RecordNotFound(`Could not retrieve document.`, 404);
    }

    const nestedGroups = await this.authzService.getNestedGroups(group?._id);
    const nestedGroupIds = nestedGroups.map((ng) => ng._id);

    if (!nestedGroupIds.length) {
      throw new Error(`No nested groups found for: ${group?._id}`);
    }

    const [roles, permissions] = await Promise.all([this.authzService.getRoles(), this.authzService.getPermissions()]);

    let success = true;
    try {
      logger.debug(`[deleteOrganization] detaching nested groups: ${nestedGroupIds.join(', ')}`);
      await this.authzService.deleteNestedGroups(group?._id, nestedGroupIds);

      // remove nested groups;
      await forEachAsync(nestedGroupIds, async (groupId) => {
        logger.debug(`[deleteOrganization] removing nested group: ${groupId}`);
        return this.authzService.deleteGroup(groupId);
      });

      // remove roles;
      const groupRoles = this.filterByGroupName(group.name, roles.roles, applicationId);
      await forEachAsync(groupRoles, async (role) => {
        logger.debug(`[deleteOrganization] removing role: ${role?._id} - ${role.name}`);
        return this.authzService.deleteRole(role?._id);
      });

      // remove permissions;
      const groupPermissions = this.filterByGroupName(group.name, permissions.permissions, applicationId);
      await forEachAsync(groupPermissions, async (perm) => {
        logger.debug(`[deleteOrganization] removing permission: ${perm?._id} - ${perm.name}`);
        return this.authzService.deletePermission(perm?._id);
      });

      // delete main group;
      logger.debug(`[deleteOrganization] removing main group: ${group?._id}`);
      await this.authzService.deleteGroup(group?._id);
    } catch (err) {
      logger.error(err);
      success = false;
    }
    return success;
  }

  /**
   * Bootstrap "SuperAdmin" role and related permissions.
   * @param applicationId
   */
  async createSuperAdmin(applicationId: string = AUTH0_APPLICATION_CLIENT_ID): Promise<boolean> {
    let success: boolean = true;
    try {
      const rootPrefix = '*';
      const roleName = [rootPrefix, ROLES_NO_ORG.SuperAdmin.name].join(':');

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
      await this.authzService.createRole(roleName, ROLES_NO_ORG.SuperAdmin.description, AUTH0_APPLICATION_CLIENT_ID, [
        ...ROLES_NO_ORG.SuperAdmin.readScopes.map((scope) => permissionMap[scope]),
        ...ROLES_NO_ORG.SuperAdmin.writeScopes.map((scope) => permissionMap[scope]),
      ]);
    } catch (err) {
      logger.error(err);
      success = false;
    }
    return success;
  }

  /**
   * Update configuration for existing organizations.
   * @param applicationId
   */
  async updateOrganizationConfig(applicationId: string = AUTH0_APPLICATION_CLIENT_ID): Promise<boolean> {
    let success: boolean = true;
    try {
      const { groups } = await this.authzService.getGroups();
      const groupsMap = this.reduceByName<{ [key: string]: any }>(groups);
      const groupsMapPrimary = this.reduceByName<{ [key: string]: any }>(groups.filter((g) => 'nested' in g));

      const { permissions } = await this.authzService.getPermissions();
      const permissionsMap = this.reduceByName<{ [key in ScopesEnum]?: any }>(permissions);

      const { roles } = await this.authzService.getRoles();
      const rolesMap = this.reduceByName<{ [key in RoleEnum]?: any }>(roles);

      for (const [groupName, primaryGroup] of Object.entries(groupsMapPrimary)) {
        for (const roleType of Object.values(ROLES)) {
          const nestedName = [groupName, roleType.name.toUpperCase()].join('-');
          const nestedDescription = [groupName, roleType.name].join(' ');

          if (!groupsMap[nestedName]) {
            logger.debug(`creating nested group: ${nestedName}`);

            // create the nested group;
            const nested = await this.authzService.createGroup(nestedName, nestedDescription);
            groupsMap[nested.name] = nested;

            logger.debug(`attaching nested group: ${nested._id} to primary group: ${primaryGroup._id}`);

            // add the nested group to the primary group;
            await this.authzService.addNestedGroups(primaryGroup._id, [nested._id]);
          }

          // create permissions;
          await forEachAsync(roleType.readScopes, async (scope) => {
            const read = [groupName, scope].join(':');
            if (!permissionsMap[read]) {
              logger.debug(`creating permission: ${read} for group: ${groupsMap[nestedName].name}`);
              permissionsMap[read] = await this.authzService.createPermission(
                read,
                SCOPES_READ_DESCRIPTION,
                applicationId
              );
            }
          });
          await forEachAsync(roleType.writeScopes, async (scope) => {
            const write = [groupName, scope].join(':');
            if (!permissionsMap[write]) {
              logger.debug(`creating permission: ${write} for group: ${groupsMap[nestedName].name}`);
              permissionsMap[write] = await this.authzService.createPermission(
                write,
                SCOPES_WRITE_DESCRIPTION,
                applicationId
              );
            }
          });

          const roleName = [groupName, roleType.name].join(':');
          if (!rolesMap[roleName]) {
            logger.debug(`creating role: ${roleName} for group: ${groupsMap[nestedName].name}`);

            // create role;
            rolesMap[roleName] = await this.authzService.createRole(roleName, roleType.description, applicationId, [
              ...roleType.readScopes.map((scope) => {
                const s = [groupName, scope].join(':');
                return permissionsMap[s]._id;
              }),
              ...roleType.writeScopes.map((scope) => {
                const s = [groupName, scope].join(':');
                return permissionsMap[s]._id;
              }),
            ]);

            logger.debug(`assigning role: ${rolesMap[roleName]._id} to group: ${groupsMap[nestedName].name}`);

            // add the role to the nested group;
            await this.authzService.addGroupRoles(groupsMap[nestedName]._id, [rolesMap[roleName]._id]);
          } else {
            const role = rolesMap[roleName];
            logger.debug(`updating role: ${role.name} for group: ${groupsMap[nestedName].name}`);

            const readScopes = roleType.readScopes.map((scope) => {
              const read = [groupName, scope].join(':');
              return permissionsMap[read]._id;
            });
            const writeScopes = roleType.writeScopes.map((scope) => {
              const write = [groupName, scope].join(':');
              return permissionsMap[write]._id;
            });

            // update role permissions;
            await this.authzService.updateRole(role._id, role.name, role.description, applicationId, [
              ...readScopes,
              ...writeScopes,
            ]);
          }
        }
      }
    } catch (err) {
      logger.error(err);
      success = false;
    }
    return success;
  }

  /**
   * Enforce a URL friendly name for the organization.
   * @param value
   */
  enforceOrganizationName(value: string): boolean {
    const slugRegexp = new RegExp('^[A-Z0-9](-?[A-Z0-9])*$');
    return !!value.match(slugRegexp);
  }

  reduceByName<T>(records: any): T {
    return records.reduce((acc, record) => {
      acc[record.name] = record;
      return acc;
    }, <T>{});
  }

  filterByGroupName<T extends { name: string; applicationId: string }>(
    groupName: string,
    records: T[],
    applicationId: string
  ) {
    return records.filter((o: T) => groupName === o.name.split(':')[0] && applicationId === o.applicationId);
  }
}
