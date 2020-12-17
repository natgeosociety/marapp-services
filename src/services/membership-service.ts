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

import { AUTH0_APPLICATION_CLIENT_ID } from '../config/auth0';
import { AlreadyExistsError, RecordNotFound } from '../errors';
import { forEachAsync } from '../helpers/util';
import { getLogger } from '../logging';
import { ScopesEnum } from '../middlewares/authz-guards';

import { AuthzServiceSpec } from './auth0-authz';

const logger = getLogger('membership-service');

const GLOBAL_PREFIX = '*';

export enum WorkspaceRoleEnum {
  PUBLIC = 'Public',
  VIEWER = 'Viewer',
  EDITOR = 'Editor',
  ADMIN = 'Admin',
  OWNER = 'Owner',
}

export enum GlobalRoleEnum {
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
const SCOPES_READ_GLOBAL = [ScopesEnum.ReadOrganizations];
const SCOPES_READ_DESCRIPTION = 'Provides the ability to read data from a specific resource inside an organization.';
const SCOPES_READ_GLOBAL_DESCRIPTION = 'Provides read-only access for administrative tasks.';

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
const SCOPES_WRITE_GLOBAL = [ScopesEnum.WriteOrganizations];
const SCOPES_WRITE_DESCRIPTION = 'Provides the ability to modify data on a specific resource inside an organization.';
const SCOPES_WRITE_GLOBAL_DESCRIPTION = 'Provides the ability to perform administrative tasks.';

type PermissionType = { name: string; readScopes: ScopesEnum[]; writeScopes: ScopesEnum[]; description: string };

const ROLES_WORKSPACE: { [key in WorkspaceRoleEnum]?: PermissionType } = {
  [WorkspaceRoleEnum.PUBLIC]: {
    name: WorkspaceRoleEnum.PUBLIC,
    readScopes: [
      ScopesEnum.ReadLocations,
      ScopesEnum.ReadLayers,
      ScopesEnum.ReadWidgets,
      ScopesEnum.ReadDashboards,
      ScopesEnum.ReadCollections,
    ],
    writeScopes: [],
    description: 'Can view public content managed by the organization.',
  },
  [WorkspaceRoleEnum.VIEWER]: {
    name: WorkspaceRoleEnum.VIEWER,
    readScopes: [ScopesEnum.ReadAll],
    writeScopes: [ScopesEnum.WriteCollections],
    description: 'Can view content managed by the organization.',
  },
  [WorkspaceRoleEnum.EDITOR]: {
    name: WorkspaceRoleEnum.EDITOR,
    readScopes: [ScopesEnum.ReadAll],
    writeScopes: [ScopesEnum.WriteAll],
    description: 'Full content permission across the entire organization.',
  },
  [WorkspaceRoleEnum.ADMIN]: {
    name: WorkspaceRoleEnum.ADMIN,
    readScopes: [ScopesEnum.ReadAll, ScopesEnum.ReadUsers],
    writeScopes: [ScopesEnum.WriteAll, ScopesEnum.WriteUsers],
    description: 'Power over the assets managed by an organization.',
  },
  [WorkspaceRoleEnum.OWNER]: {
    name: WorkspaceRoleEnum.OWNER,
    readScopes: [ScopesEnum.ReadAll, ScopesEnum.ReadUsers],
    writeScopes: [ScopesEnum.WriteAll, ScopesEnum.WriteUsers],
    description: 'Complete power over the assets managed by an organization.',
  },
};

const ROLES_GLOBAL: { [key in GlobalRoleEnum]?: PermissionType } = {
  [GlobalRoleEnum.SUPER_ADMIN]: {
    name: GlobalRoleEnum.SUPER_ADMIN,
    readScopes: [ScopesEnum.ReadOrganizations],
    writeScopes: [ScopesEnum.WriteOrganizations],
    description: 'Manage system assets outside of an organization scope.',
  },
};

export interface MembershipServiceSpec {
  createWorkspace(name: string, description: string, ownerIds: string[], applicationId?: string): Promise<void>;
  deleteWorkspace(id: string): Promise<boolean>;
  enforceWorkspaceName(value: string): boolean;
  updateWorkspaceConfig(applicationId?: string): Promise<boolean>;
  createGlobalRoles(applicationId?: string): Promise<boolean>;
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
  async createWorkspace(
    name: string,
    description: string,
    ownerIds: string[],
    applicationId: string = AUTH0_APPLICATION_CLIENT_ID
  ) {
    const groupsMap: { [key in WorkspaceRoleEnum]?: string } = {};
    const rolesMap: { [key in ScopesEnum]?: string } = {};
    const permissionMap: { [key in ScopesEnum]?: string } = {};

    let main;
    try {
      logger.debug('[createWorkspace] creating workspace primary group');
      main = await this.authzService.createGroup(name, description);
    } catch (err) {
      throw new AlreadyExistsError('An organization with the same name already exists.', 400);
    }
    try {
      logger.debug('[createWorkspace] creating workspace nested groups');
      await forEachAsync(Object.values(WorkspaceRoleEnum), async (roleType) =>
        this.createNestedGroup(name, roleType).then((g) => (groupsMap[roleType] = g._id))
      );

      logger.debug('[createWorkspace] attaching nested groups to primary group');
      await this.authzService.addNestedGroups(main._id, Object.values(groupsMap));

      logger.debug('[createWorkspace] creating workspace permissions');
      await Promise.all([
        forEachAsync(SCOPES_READ, async (scope) =>
          this.createWorkspacePermission(name, scope, SCOPES_READ_DESCRIPTION, applicationId).then(
            (perm) => (permissionMap[scope] = perm._id)
          )
        ),
        forEachAsync(SCOPES_WRITE, async (scope) =>
          this.createWorkspacePermission(name, scope, SCOPES_WRITE_DESCRIPTION, applicationId).then(
            (perm) => (permissionMap[scope] = perm._id)
          )
        ),
      ]);

      logger.debug('[createWorkspace] creating workspace roles');
      await forEachAsync(Object.values(WorkspaceRoleEnum), async (roleType) =>
        this.createWorkspaceRole(name, roleType, permissionMap, applicationId).then((r) => (rolesMap[roleType] = r._id))
      );

      logger.debug('[createWorkspace] attaching roles to workspace groups');
      await forEachAsync(Object.values(WorkspaceRoleEnum), async (roleType) =>
        this.authzService.addGroupRoles(groupsMap[roleType], [rolesMap[roleType]])
      );

      logger.debug('[createWorkspace] adding initial group owners');
      const ownerGroupId = groupsMap[WorkspaceRoleEnum.OWNER];
      await this.authzService.addGroupMembers(main._id, ownerGroupId, ownerIds);
    } catch (err) {
      logger.error(err);
    }
    return main;
  }

  /**
   * Deletes all resources required by an organization: groups, nested groups, roles and permissions.
   * @param groupId: primary group ID
   * @param applicationId:
   */
  async deleteWorkspace(groupId: string, applicationId: string = AUTH0_APPLICATION_CLIENT_ID): Promise<boolean> {
    const group = await this.authzService.getGroup(groupId);
    if (!group) {
      throw new RecordNotFound(`Could not retrieve document.`, 404);
    }
    const nestedGroups = await this.authzService.getAllNestedGroups(group?._id);
    const nestedGroupIds = nestedGroups.map((ng) => ng._id);

    if (!nestedGroupIds.length) {
      throw new Error(`No nested groups found for: ${group?._id}`);
    }
    let success = true;
    try {
      const [roles, permissions] = await Promise.all([
        this.authzService.getRoles(),
        this.authzService.getPermissions(),
      ]);

      logger.debug(`[deleteWorkspace] detaching nested groups: ${nestedGroupIds.join(', ')}`);
      await this.authzService.deleteNestedGroups(group?._id, nestedGroupIds);

      await forEachAsync(nestedGroupIds, async (groupId) => {
        logger.debug(`[deleteWorkspace] removing nested group: ${groupId}`);
        return this.authzService.deleteGroup(groupId);
      });

      const groupRoles = this.filterByGroupName(group.name, roles.roles, applicationId);
      await forEachAsync(groupRoles, async (role) => {
        logger.debug(`[deleteWorkspace] removing role: ${role?._id} - ${role.name}`);
        return this.authzService.deleteRole(role?._id);
      });

      const groupPermissions = this.filterByGroupName(group.name, permissions.permissions, applicationId);
      await forEachAsync(groupPermissions, async (perm) => {
        logger.debug(`[deleteWorkspace] removing permission: ${perm?._id} - ${perm.name}`);
        return this.authzService.deletePermission(perm?._id);
      });

      logger.debug(`[deleteWorkspace] removing main group: ${group?._id}`);
      await this.authzService.deleteGroup(group?._id);
    } catch (err) {
      logger.error(err);
      success = false;
    }
    return success;
  }

  /**
   * Bootstrap global roles and related permissions.
   * @param applicationId
   */
  async createGlobalRoles(applicationId: string = AUTH0_APPLICATION_CLIENT_ID): Promise<boolean> {
    const permissionMap: { [key in ScopesEnum]?: string } = {};

    let success: boolean = true;
    try {
      logger.debug('[createGlobalRoles] creating global permissions');
      await Promise.all([
        forEachAsync(SCOPES_READ_GLOBAL, async (scope) =>
          this.createWorkspacePermission(GLOBAL_PREFIX, scope, SCOPES_READ_GLOBAL_DESCRIPTION, applicationId).then(
            (perm) => (permissionMap[scope] = perm._id)
          )
        ),
        forEachAsync(SCOPES_WRITE_GLOBAL, async (scope) =>
          this.createWorkspacePermission(GLOBAL_PREFIX, scope, SCOPES_WRITE_GLOBAL_DESCRIPTION, applicationId).then(
            (perm) => (permissionMap[scope] = perm._id)
          )
        ),
      ]);

      logger.debug('[createGlobalRoles] creating global roles');
      await forEachAsync(Object.values(GlobalRoleEnum), async (roleType) =>
        this.createGlobalRole(roleType, permissionMap, applicationId)
      );
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
  async updateWorkspaceConfig(applicationId: string = AUTH0_APPLICATION_CLIENT_ID): Promise<boolean> {
    let success: boolean = true;
    try {
      const { groups } = await this.authzService.getGroups();
      const groupMap = this.reduceByName<{ [key: string]: any }>(groups);
      const primaryGroupMap = this.reduceByName<{ [key: string]: any }>(groups.filter((g) => 'nested' in g));

      const { permissions } = await this.authzService.getPermissions();
      const permissionMap = this.reduceByName<{ [key in ScopesEnum]?: any }>(permissions);

      const { roles } = await this.authzService.getRoles();
      const roleMap = this.reduceByName<{ [key in WorkspaceRoleEnum]?: any }>(roles);

      for (const [rootGroupName, rootGroupData] of Object.entries(primaryGroupMap)) {
        for (const roleType of Object.values(ROLES_WORKSPACE)) {
          const nestedName = [rootGroupName, roleType.name.toUpperCase()].join('-');
          let nestedGroupData = groupMap[nestedName];

          if (!nestedGroupData) {
            logger.debug('[updateWorkspaceConfig] creating nested group: %s', nestedName);
            nestedGroupData = await this.createNestedGroup(rootGroupName, roleType.name);
            groupMap[nestedGroupData.name] = nestedGroupData;

            // prettier-ignore
            logger.debug('[updateWorkspaceConfig] attaching nested group: %s to primary group: %s', nestedGroupData._id, rootGroupData._id);
            await this.authzService.addNestedGroups(rootGroupData._id, [nestedGroupData._id]);
          }

          await forEachAsync(roleType.readScopes, async (scope) => {
            const perm = [rootGroupName, scope].join(':');
            if (!permissionMap[perm]) {
              logger.debug('[updateWorkspaceConfig] creating permission: %s for group: %s', perm, nestedGroupData.name);
              permissionMap[perm] = await this.createWorkspacePermission(
                rootGroupName,
                scope,
                SCOPES_READ_DESCRIPTION,
                applicationId
              );
            }
          });
          await forEachAsync(roleType.writeScopes, async (scope) => {
            const perm = [rootGroupName, scope].join(':');
            if (!permissionMap[perm]) {
              logger.debug('[updateWorkspaceConfig] creating permission: %s for group: %s', perm, nestedGroupData.name);
              permissionMap[perm] = await this.createWorkspacePermission(
                rootGroupName,
                scope,
                SCOPES_WRITE_DESCRIPTION,
                applicationId
              );
            }
          });

          const roleName = [rootGroupName, roleType.name].join(':');
          if (!roleMap[roleName]) {
            logger.debug('[updateWorkspaceConfig] creating role: %s for group: %s', roleName, nestedName);
            const role = await this.authzService.createRole(roleName, roleType.description, applicationId, [
              ...roleType.readScopes.map((scope) => {
                const s = [rootGroupName, scope].join(':');
                return permissionMap[s]._id;
              }),
              ...roleType.writeScopes.map((scope) => {
                const s = [rootGroupName, scope].join(':');
                return permissionMap[s]._id;
              }),
            ]);
            roleMap[roleName] = role;

            logger.debug('[updateWorkspaceConfig] assigning role: %s to group: %s', role._id, nestedName);
            await this.authzService.addGroupRoles(nestedGroupData._id, [role._id]);
          } else {
            const role = roleMap[roleName];
            logger.debug('[updateWorkspaceConfig] updating role: %s for group: %s', role.name, nestedGroupData.name);

            const readScopes = roleType.readScopes.map((scope) => [rootGroupName, scope].join(':'));
            const writeScopes = roleType.writeScopes.map((scope) => [rootGroupName, scope].join(':'));

            const scopes = [...readScopes, ...writeScopes];
            const permissionIds = scopes.map((scope) => permissionMap[scope]._id);

            // prettier-ignore
            logger.debug('[updateWorkspaceConfig] updating permissions for role: %s permissions: %s', roleName, scopes.join(', '));
            await this.authzService.updateRole(role._id, role.name, role.description, applicationId, permissionIds);
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
  enforceWorkspaceName(value: string): boolean {
    const slugRegexp = new RegExp('^[a-z0-9](-?[a-z0-9])*$');
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

  async createNestedGroup(rootName: string, roleType: string) {
    const name = [rootName, roleType.toUpperCase()].join('-');
    const description = [rootName, roleType].join(' ');
    return this.authzService.createGroup(name, description);
  }

  async createWorkspaceRole(
    rootName: string,
    roleType: string,
    permissionMap: { [key in ScopesEnum]?: string },
    applicationId: string
  ) {
    const name = [rootName, ROLES_WORKSPACE[roleType].name].join(':');
    const description = ROLES_WORKSPACE[roleType].description;
    const permissions = [
      ...ROLES_WORKSPACE[roleType].readScopes.map((scope) => permissionMap[scope]),
      ...ROLES_WORKSPACE[roleType].writeScopes.map((scope) => permissionMap[scope]),
    ];
    return this.authzService.createRole(name, description, applicationId, permissions);
  }

  async createGlobalRole(roleType: string, permissionMap: { [key in ScopesEnum]?: string }, applicationId: string) {
    const name = [GLOBAL_PREFIX, ROLES_GLOBAL[roleType].name].join(':');
    const description = ROLES_GLOBAL[roleType].description;
    const permissions = [
      ...ROLES_GLOBAL[roleType].readScopes.map((scope) => permissionMap[scope]),
      ...ROLES_GLOBAL[roleType].writeScopes.map((scope) => permissionMap[scope]),
    ];
    return this.authzService.createRole(name, description, applicationId, permissions);
  }

  async createWorkspacePermission(rootName: string, scope: string, description: string, applicationId: string) {
    const read = [rootName, scope].join(':');
    return this.authzService.createPermission(read, description, applicationId);
  }
}
