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

import { AuthorizationClient } from '@natgeosociety/auth0-authorization';
import { User } from 'auth0';
import { Redis } from 'ioredis';
import { get, merge, set } from 'lodash';
import makeError from 'make-error';

import { REDIS_CACHE_TTL } from '../config';
import { AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_DOMAIN, AUTH0_EXTENSION_URL } from '../config/auth0';
import { forEachAsync } from '../helpers/util';
import { getLogger } from '../logging';

import { WithCache } from './base/WithCache';
import { GlobalRoleEnum } from './membership-service';

export const Auth0Error = makeError('Auth0Error');

const logger = getLogger();

type GroupType = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER' | 'PUBLIC';

enum CacheKeys {
  GROUPS = 'GROUPS',
  NESTED_GROUPS = 'NESTED_GROUPS',
  NESTED_GROUPS_MEMBERS = 'NESTED_GROUPS_MEMBERS',
  USER_GROUPS = 'USER_GROUPS',
  ROLES = 'ROLES',
  NESTED_GROUPS_ROLES = 'NESTED_GROUPS_ROLES',
  PERMISSIONS = 'PERMISSIONS',
  GROUP_MEMBERSHIP = 'GROUP_MEMBERSHIP',
}

export interface AuthzServiceSpec {
  getGroup(id: string);
  getGroups(filterGroups?: string[]);
  getUserGroups(id: string);
  getGroupOwners(id: string, onlyIds?: boolean): Promise<string[] | User[]>;
  getGroupAdmins(id: string, onlyIds?: boolean): Promise<string[] | User[]>;
  getSuperAdmins(onlyIds?: boolean): Promise<string[] | User[]>;
  isGroupOwner(userId: string, groupId: string): Promise<string>;
  isGroupAdmin(userId: string, groupId: string): Promise<string>;
  createGroup(name: string, description: string, members?: string[]);
  updateGroup(id: string, name: string, description: string);
  addNestedGroups(groupId: string, nestedGroupIds: string[]);
  deleteNestedGroups(groupId: string, nestedGroupIds: string[]);
  addGroupRoles(groupId: string, roleIds: string[]);
  deleteGroup(groupId: string);
  getPermissions();
  createPermission(name: string, description: string, applicationId: string, applicationType?: string);
  deletePermission(permissionId: string);
  getRole(roleId: string);
  getRoles();
  createRole(
    name: string,
    description: string,
    applicationId: string,
    permissions?: string[],
    applicationType?: string
  );
  updateRole(
    id: string,
    name: string,
    description: string,
    applicationId: string,
    permissions: string[],
    applicationType?: string
  );
  addUserToRoles(userId: string, roleIds: string[]);
  removeUserFromRoles(userId: string, roleIds: string[]);
  deleteRole(roleId: string);
  calculateGroupMemberships(groupId: string);
  getAllNestedGroups(groupId: string, filterGroups?: GroupType[], excludeGroups?: GroupType[]);
  getNestedGroups(groupId: string, filterGroups?: GroupType[], excludeGroups?: GroupType[]);
  getNestedGroupMembers(groupId: string, page?: number, perPage?: number);
  getNestedGroupRoles(groupId: string);
  mapNestedGroupRoles(nestedGroupRoles: any[]);
  findPrimaryGroupId(groupMembership: any[], primaryGroupName: string);
  addGroupMembers(groupId: string, userIds: string[]);
  deleteGroupMembers(groupId: string, userIds: string[]);
  getMemberGroups(userId: string, primaryGroups: string[]);
}

export class Auth0AuthzService extends WithCache implements AuthzServiceSpec {
  readonly authzClient: AuthorizationClient;

  constructor(config?: {
    connection?: {
      clientId?: string;
      clientSecret?: string;
      domain?: string;
      extensionUrl?: string;
    };
    cache?: Redis;
    cacheTTL?: number;
  }) {
    super(config?.cache, config?.cacheTTL);
    let options = {
      clientId: AUTH0_CLIENT_ID,
      clientSecret: AUTH0_CLIENT_SECRET,
      domain: AUTH0_DOMAIN,
      extensionUrl: AUTH0_EXTENSION_URL,
    };
    if (config?.connection) {
      options = merge(options, config.connection);
    }
    this.authzClient = new AuthorizationClient(options);
  }

  async getGroups(filterGroups: string[] = []) {
    const cacheKey = this.mkCacheKey(CacheKeys.GROUPS);
    let response = await this.fromCache(cacheKey);
    if (!response) {
      response = await this.authzClient.getGroups();
      await this.toCache(cacheKey, response);
    }
    if (filterGroups.length) {
      const groups = response.groups.filter((group: any) => filterGroups.every((k) => group.name === k));
      const total = response.groups.length;

      return { groups, total };
    }
    return response;
  }

  async getGroup(groupId: string) {
    const cacheKey = this.mkCacheKey(CacheKeys.GROUPS, groupId);
    const hit = await this.fromCache(cacheKey);
    if (hit) {
      return hit;
    }
    const response = await this.authzClient.getGroup({ groupId });
    await this.toCache(cacheKey, response);

    return response;
  }

  async getUserGroups(userId: string) {
    const cacheKey = this.mkCacheKey(CacheKeys.USER_GROUPS, userId);
    const hit = await this.fromCache(cacheKey);
    if (hit) {
      return hit;
    }
    const response = await this.authzClient.getUserGroups({ userId });
    await this.toCache(cacheKey, response);

    return response;
  }

  async getGroupOwners(groupId: string, onlyIds: boolean = false): Promise<string[] | User[]> {
    const groups = await this.getNestedGroups(groupId, ['OWNER']);
    if (!groups.length) {
      return [];
    }
    const members: string[] = get(groups[0], 'members', []);
    if (onlyIds) {
      return members;
    }
    return Promise.all(members.map((userId) => this.authzClient.getUser({ userId })));
  }

  async getGroupAdmins(id: string, onlyIds: boolean = false): Promise<string[] | User[]> {
    const groups = await this.getNestedGroups(id, ['ADMIN']);
    if (!groups.length) {
      return [];
    }
    const members: string[] = get(groups[0], 'members', []);
    if (onlyIds) {
      return members;
    }
    return Promise.all(members.map((userId) => this.authzClient.getUser({ userId })));
  }

  async getSuperAdmins(onlyIds: boolean = false) {
    const { roles } = await this.getRoles();
    const superAdminRole = roles.find((r) => r?.name && r?.name.endsWith(GlobalRoleEnum.SUPER_ADMIN));
    if (!superAdminRole) {
      return [];
    }
    const members: string[] = get(superAdminRole, 'users', []);
    if (onlyIds) {
      return members;
    }
    return Promise.all(members.map((userId) => this.authzClient.getUser({ userId })));
  }

  async isGroupOwner(userId: string, groupId: string): Promise<string> {
    const owners = <string[]>await this.getGroupOwners(groupId, true);
    return owners.find((ownerId) => ownerId === userId);
  }

  async isGroupAdmin(userId: string, groupId: string): Promise<string> {
    const admins = <string[]>await this.getGroupAdmins(groupId, true);
    return admins.find((adminId) => adminId === userId);
  }

  async createGroup(name: string, description: string, members?: string[]) {
    const response = await this.authzClient.createGroup({ name, description, members });
    await this.removeCache(this.mkCacheKey(CacheKeys.GROUPS));

    return response;
  }

  async updateGroup(id: string, name: string, description: string, members?: string[]) {
    const response = await this.authzClient.updateGroup({ _id: id, name, description, members });
    await Promise.all([
      this.removeCache(this.mkCacheKey(CacheKeys.GROUPS, id)),
      this.removeCache(this.mkCacheKey(CacheKeys.GROUPS)),
    ]);

    return response;
  }

  async addNestedGroups(groupId: string, nestedGroupIds: string[]) {
    const response = await this.authzClient.addNestedGroups({ groupId, nestedGroupIds });
    await Promise.all([
      this.removeCache(this.mkCacheKey(CacheKeys.GROUPS, groupId)),
      this.removeCache(this.mkCacheKey(CacheKeys.GROUPS)),
    ]);

    return response;
  }

  async deleteNestedGroups(groupId: string, nestedGroupIds: string[]) {
    const response = await this.authzClient.deleteNestedGroups({ groupId, nestedGroupIds });
    await Promise.all([
      this.removeCache(this.mkCacheKey(CacheKeys.GROUPS, groupId)),
      this.removeCache(this.mkCacheKey(CacheKeys.GROUPS)),
    ]);

    return response;
  }

  async addGroupRoles(groupId: string, roleIds: string[]) {
    const response = await this.authzClient.addGroupRoles({ groupId, roleIds });
    await Promise.all([
      this.removeCache(this.mkCacheKey(CacheKeys.GROUPS)),
      this.removeCache(this.mkCacheKey(CacheKeys.GROUPS, groupId)),
    ]);

    return response;
  }

  async getPermissions() {
    const cacheKey = this.mkCacheKey(CacheKeys.PERMISSIONS);
    const hit = await this.fromCache(cacheKey);
    if (hit) {
      return hit;
    }
    const response = await this.authzClient.getPermissions();
    await this.toCache(cacheKey, response);

    return response;
  }

  async createPermission(name: string, description: string, applicationId: string, applicationType: string = 'client') {
    const response = await this.authzClient.createPermission({ name, description, applicationId, applicationType });
    await this.removeCache(this.mkCacheKey(CacheKeys.PERMISSIONS));

    return response;
  }

  async deletePermission(permissionId: string) {
    const response = await this.authzClient.deletePermission({ permissionId });
    await Promise.all([
      this.removeCache(this.mkCacheKey(CacheKeys.PERMISSIONS, permissionId)),
      this.removeCache(this.mkCacheKey(CacheKeys.PERMISSIONS)),
    ]);

    return response;
  }

  async getRole(roleId: string) {
    const cacheKey = this.mkCacheKey(CacheKeys.ROLES, roleId);
    const hit = await this.fromCache(cacheKey);
    if (hit) {
      return hit;
    }
    const response = await this.authzClient.getRole({ roleId });
    await this.toCache(cacheKey, response);

    return response;
  }

  async getRoles() {
    const cacheKey = this.mkCacheKey(CacheKeys.ROLES);
    const hit = await this.fromCache(cacheKey);
    if (hit) {
      return hit;
    }
    const response = await this.authzClient.getRoles();
    await this.toCache(cacheKey, response);

    return response;
  }

  async createRole(
    name: string,
    description: string,
    applicationId: string,
    permissions: string[] = [],
    applicationType: string = 'client'
  ) {
    const response = await this.authzClient.createRole({
      name,
      description,
      applicationId,
      applicationType,
      permissions,
    });
    await this.removeCache(this.mkCacheKey(CacheKeys.ROLES));

    return response;
  }

  async updateRole(
    id: string,
    name: string,
    description: string,
    applicationId: string,
    permissions: string[],
    applicationType: string = 'client'
  ) {
    const response = await this.authzClient.updateRole({
      _id: id,
      name,
      description,
      applicationId,
      applicationType,
      permissions,
    });
    await Promise.all([
      this.removeCache(this.mkCacheKey(CacheKeys.ROLES, id)),
      this.removeCache(this.mkCacheKey(CacheKeys.ROLES)),
    ]);

    return response;
  }

  async addUserToRoles(userId: string, roleIds: string[]) {
    const response = await this.authzClient.addUserToRoles({ userId, roleIds });
    await this.removeCache(this.mkCacheKey(CacheKeys.ROLES));

    return response;
  }

  async removeUserFromRoles(userId: string, roleIds: string[]) {
    const response = await this.authzClient.removeUserFromRoles({ userId, roleIds });
    await this.removeCache(this.mkCacheKey(CacheKeys.ROLES));

    return response;
  }

  async deleteRole(roleId: string) {
    const response = await this.authzClient.deleteRole({ roleId });
    await Promise.all([
      this.removeCache(this.mkCacheKey(CacheKeys.ROLES, roleId)),
      this.removeCache(this.mkCacheKey(CacheKeys.ROLES)),
    ]);

    return response;
  }

  async getAllNestedGroups(groupId: string, filterGroups: GroupType[] = [], excludeGroups: GroupType[] = []) {
    const cacheKey = this.mkCacheKey(CacheKeys.NESTED_GROUPS, groupId);
    let response = await this.fromCache(cacheKey);
    if (!response) {
      response = await this.authzClient.getNestedGroups({ groupId });
      await this.toCache(cacheKey, response);
    }
    if (filterGroups.length) {
      response = response.filter((g: any) => filterGroups.every((k) => g.name.endsWith(k)));
    }
    return response.filter((r: any) => excludeGroups.every((k) => !r.name.endsWith(k)));
  }

  async getNestedGroups(groupId: string, filterGroups: GroupType[] = [], excludeGroups: GroupType[] = []) {
    const exclude: GroupType[] = ['PUBLIC'];
    exclude.push(...excludeGroups);
    return this.getAllNestedGroups(groupId, filterGroups, exclude);
  }

  async getNestedGroupMembers(groupId: string, page: number = 1, perPage: number = 10) {
    const cacheKey = this.mkCacheKey(CacheKeys.NESTED_GROUPS_MEMBERS, groupId, page, perPage);
    const hit = await this.fromCache(cacheKey);
    if (hit) {
      return { docs: hit.nested, total: hit.total };
    }
    const response = await this.authzClient.getNestedGroupMembers({ groupId }, { page, perPage });
    await this.toCache(cacheKey, response);

    return { docs: response.nested, total: response.total };
  }

  async getNestedGroupRoles(groupId: string) {
    const cacheKey = this.mkCacheKey(CacheKeys.NESTED_GROUPS_ROLES, groupId);
    const hit = await this.fromCache(cacheKey);
    if (hit) {
      return hit;
    }
    const response = await this.authzClient.getNestedGroupRoles({ groupId });
    await this.toCache(cacheKey, response);

    return response;
  }

  async calculateGroupMemberships(userId: string) {
    const cacheKey = this.mkCacheKey(CacheKeys.GROUP_MEMBERSHIP, userId);
    const hit = await this.fromCache(cacheKey);
    if (hit) {
      return hit;
    }
    const response = await this.authzClient.calculateGroupMemberships({ userId });
    await this.toCache(cacheKey, response);

    return response;
  }

  async addGroupMembers(groupId: string, userIds: string[]) {
    const response = await this.authzClient.addGroupMembers({ groupId, userIds });
    await Promise.all([
      this.removeCache(this.mkCacheKey(CacheKeys.NESTED_GROUPS_ROLES, groupId)),
      this.removeCachePrefix(this.mkCacheKey(CacheKeys.NESTED_GROUPS, '*')),
      this.removeCachePrefix(this.mkCacheKey(CacheKeys.NESTED_GROUPS_MEMBERS, '*')),
      ...userIds.map((userId: string) => this.removeCache(this.mkCacheKey(CacheKeys.GROUP_MEMBERSHIP, userId))),
    ]);

    return response;
  }

  async deleteGroupMembers(groupId: string, userIds: string[]) {
    const response = await this.authzClient.deleteGroupMembers({ groupId, userIds });
    await Promise.all([
      this.removeCache(this.mkCacheKey(CacheKeys.NESTED_GROUPS_ROLES, groupId)),
      this.removeCachePrefix(this.mkCacheKey(CacheKeys.NESTED_GROUPS, '*')),
      this.removeCachePrefix(this.mkCacheKey(CacheKeys.NESTED_GROUPS_MEMBERS, '*')),
      ...userIds.map((userId: string) => this.removeCache(this.mkCacheKey(CacheKeys.GROUP_MEMBERSHIP, userId))),
    ]);

    return response;
  }

  async deleteGroup(groupId: string) {
    const response = await this.authzClient.deleteGroup({ groupId });
    await Promise.all([
      this.removeCachePrefix(this.mkCacheKey(CacheKeys.NESTED_GROUPS_MEMBERS, groupId, '*')),
      this.removeCache(this.mkCacheKey(CacheKeys.NESTED_GROUPS_ROLES, groupId)),
      this.removeCache(this.mkCacheKey(CacheKeys.GROUPS, groupId)),
      this.removeCache(this.mkCacheKey(CacheKeys.GROUPS)),
    ]);

    return response;
  }

  async getMemberGroups(userId: string, primaryGroups: string[]) {
    let groups = [];
    try {
      const members = <any>await this.calculateGroupMemberships(userId);

      const primaryGroupIds = primaryGroups
        .filter((pg: string) => members.find((m) => m.name === pg))
        .map((g) => this.findPrimaryGroupId(members, g));

      const nestedGroups = await forEachAsync(primaryGroupIds, async (groupId) => this.getNestedGroups(groupId));
      const flatten = [].concat.apply([], nestedGroups);
      const nestedGroupRoles = await forEachAsync(flatten, async (group: any) => this.getNestedGroupRoles(group._id));

      const groupRoles = this.mapNestedGroupRoles(nestedGroupRoles);
      groups = groupRoles.filter((groupRole: any) => get(groupRole, 'members', []).includes(userId));
    } catch (err) {
      logger.error(`Could not resolve member groups for: ${userId}`);
    }
    return groups;
  }

  mapNestedGroupRoles(nestedGroupRoles: any[]) {
    const groupRolesMap = nestedGroupRoles.reduce((acc, groupRoles) => {
      groupRoles.forEach((groupRole) => {
        const groupId = get(groupRole, 'group._id');
        const role = {
          id: get(groupRole, 'role._id'),
          name: get(groupRole, 'role.name'),
          description: get(groupRole, 'role.description'),
        };
        const roles = get(acc, [groupId, 'roles'], []);
        const group = {
          id: groupId,
          name: get(groupRole, 'group.name'),
          description: get(groupRole, 'group.description'),
          members: get(groupRole, 'group.members'),
          roles: roles.concat([role]),
        };
        set(acc, groupId, group);
      });
      return acc;
    }, {});
    return Object.values(groupRolesMap);
  }

  findPrimaryGroupId(groupMembership: any[], primaryGroupName: string) {
    const group = groupMembership.find((e) => e.name === primaryGroupName);
    if (!group) {
      throw new Auth0Error(`Could not resolve primary group for: ${primaryGroupName}`);
    }
    return get(group, '_id');
  }
}
