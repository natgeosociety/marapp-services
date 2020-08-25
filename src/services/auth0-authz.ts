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
import { get, set } from 'lodash';
import makeError from 'make-error';

import { AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_DOMAIN, AUTH0_EXTENSION_URL } from '../config/auth0';
import { getLogger } from '../logging';

export const Auth0Error = makeError('Auth0Error');

const logger = getLogger();

type GroupType = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface AuthzServiceSpec {
  getGroup(id: string);
  getGroups(filterGroups?: string[]);
  getUserGroups(id: string);
  getGroupOwners(id: string);
  getGroupAdmins(id: string);
  isGroupOwner(userId: string, groupId: string);
  isGroupAdmin(userId: string, groupId: string);
  createGroup(name: string, description: string, members?: string[]);
  updateGroup(id: string, name: string, description: string);
  addNestedGroups(groupId: string, nestedGroupIds: string[]);
  deleteNestedGroups(groupId: string, nestedGroupIds: string[]);
  addGroupRoles(groupId: string, roleIds: string[]);
  deleteGroup(groupId: string);
  getPermission();
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
  deleteRole(roleId: string);
  calculateGroupMemberships(groupId: string);
  getNestedGroups(groupId: string, filterGroups?: GroupType[], excludeGroups?: GroupType[]);
  getNestedGroupMembers(groupId: string, page?: number, perPage?: number);
  getNestedGroupRoles(groupId: string);
  mapNestedGroupRoles(nestedGroupRoles: any[]);
  findPrimaryGroupId(groupMembership: any[], primaryGroupName: string);
  addGroupMembers(groupId: string, userIds: string[]);
  deleteGroupMembers(groupId: string, userIds: string[]);
}

export class Auth0AuthzService implements AuthzServiceSpec {
  constructor(private client: AuthorizationClient) {}

  async getGroups(filterGroups: string[] = []) {
    let groups = await this.client.getGroups();
    if (filterGroups.length) {
      groups.groups = groups.groups.filter((g) => filterGroups.every((k) => g.name === k));
      groups.total = groups.groups.length;
    }
    return groups;
  }

  async getGroup(id: string) {
    return this.client.getGroup({ groupId: id });
  }

  async getUserGroups(id: string) {
    return this.client.getUserGroups({ userId: id });
  }

  async getGroupOwners(id: string) {
    const groups = await this.getNestedGroups(id, ['OWNER']);

    if (!groups.length || !Array.isArray(groups[0].members)) {
      return [];
    }
    return Promise.all(groups[0].members.map((userId) => this.client.getUser({ userId })));
  }

  async getGroupAdmins(id: string) {
    const groups = await this.getNestedGroups(id, ['ADMIN']);

    if (!groups.length || !Array.isArray(groups[0].members)) {
      return [];
    }
    return Promise.all(groups[0].members.map((userId) => this.client.getUser({ userId })));
  }

  async isGroupOwner(userId: string, groupId: string) {
    const owners = await this.getGroupOwners(groupId);

    return owners.find((owner) => owner.user_id === userId);
  }

  async isGroupAdmin(userId: string, groupId: string) {
    const admins = await this.getGroupAdmins(groupId);

    return admins.find((admin) => admin.user_id === userId);
  }

  async createGroup(name: string, description: string, members?: string[]) {
    return this.client.createGroup({ name, description, members });
  }

  async updateGroup(id: string, name: string, description: string, members?: string[]) {
    return this.client.updateGroup({ _id: id, name, description, members });
  }

  async addNestedGroups(groupId: string, nestedGroupIds: string[]) {
    return this.client.addNestedGroups({ groupId, nestedGroupIds });
  }

  async deleteNestedGroups(groupId: string, nestedGroupIds: string[]) {
    return this.client.deleteNestedGroups({ groupId, nestedGroupIds });
  }

  async addGroupRoles(groupId: string, roleIds: string[]) {
    return this.client.addGroupRoles({ groupId, roleIds });
  }

  async getPermission() {
    return this.client.getPermissions();
  }

  async createPermission(name: string, description: string, applicationId: string, applicationType: string = 'client') {
    return this.client.createPermission({ name, description, applicationId, applicationType });
  }

  async deletePermission(permissionId: string) {
    return this.client.deletePermission({ permissionId });
  }

  async getRole(roleId: string) {
    return this.client.getRole({ roleId });
  }

  async getRoles() {
    return this.client.getRoles();
  }

  async createRole(
    name: string,
    description: string,
    applicationId: string,
    permissions: string[] = [],
    applicationType: string = 'client'
  ) {
    return this.client.createRole({ name, description, applicationId, applicationType, permissions });
  }

  async updateRole(
    id: string,
    name: string,
    description: string,
    applicationId: string,
    permissions: string[],
    applicationType: string = 'client'
  ) {
    return this.client.updateRole({ _id: id, name, description, applicationId, applicationType, permissions });
  }

  async deleteRole(roleId: string) {
    return this.client.deleteRole({ roleId });
  }

  async getNestedGroups(groupId: string, filterGroups: GroupType[] = [], excludeGroups: GroupType[] = []) {
    let nestedGroups = await this.client.getNestedGroups({ groupId });
    if (filterGroups.length) {
      nestedGroups = nestedGroups.filter((g) => filterGroups.every((k) => g.name.endsWith(k)));
    }
    return nestedGroups.filter((r) => excludeGroups.every((k) => !r.name.endsWith(k)));
  }

  async getNestedGroupMembers(groupId: string, page: number = 1, perPage: number = 10) {
    const { nested, total } = await this.client.getNestedGroupMembers({ groupId }, { page, perPage });
    return { docs: nested, total };
  }

  async getNestedGroupRoles(groupId: string) {
    return this.client.getNestedGroupRoles({ groupId });
  }

  async calculateGroupMemberships(userId: string) {
    return this.client.calculateGroupMemberships({ userId });
  }

  async addGroupMembers(groupId: string, userIds: string[]) {
    return this.client.addGroupMembers({ groupId, userIds });
  }

  async deleteGroupMembers(groupId: string, userIds: string[]) {
    return this.client.deleteGroupMembers({ groupId, userIds });
  }

  async deleteGroup(groupId: string) {
    return this.client.deleteGroup({ groupId });
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

/**
 * Auth0 Authorization Extension API client library.
 */
export const initAuthzClient = (): Promise<AuthorizationClient> => {
  return new Promise((resolve, reject) => {
    logger.info('Initializing the Auth0 Authorization client');

    try {
      const authzClient = new AuthorizationClient({
        clientId: AUTH0_CLIENT_ID,
        clientSecret: AUTH0_CLIENT_SECRET,
        domain: AUTH0_DOMAIN,
        extensionUrl: AUTH0_EXTENSION_URL,
      });

      logger.warn('Auth0 Authorization client initialized successfully');

      resolve(authzClient);
    } catch (err) {
      logger.error(err);
      throw new Auth0Error(`Auth0 connection error. Failed to authenticate with client: ${AUTH0_CLIENT_ID}`);
    }
  });
};
