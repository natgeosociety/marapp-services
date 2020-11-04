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
import { get, set } from 'lodash';
import makeError from 'make-error';

import { AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_DOMAIN, AUTH0_EXTENSION_URL } from '../config/auth0';
import { forEachAsync } from '../helpers/util';
import { getLogger } from '../logging';

import { GlobalRoleEnum } from './membership-service';

export const Auth0Error = makeError('Auth0Error');

const logger = getLogger();

type GroupType = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER' | 'PUBLIC';

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

export class Auth0AuthzService implements AuthzServiceSpec {
  authzClient: AuthorizationClient;

  constructor(
    clientId: string = AUTH0_CLIENT_ID,
    clientSecret: string = AUTH0_CLIENT_SECRET,
    domain: string = AUTH0_DOMAIN,
    extensionUrl: string = AUTH0_EXTENSION_URL
  ) {
    const options = { clientId, clientSecret, domain, extensionUrl };
    this.authzClient = new AuthorizationClient(options);
  }

  async getGroups(filterGroups: string[] = []) {
    let groups = await this.authzClient.getGroups();
    if (filterGroups.length) {
      groups.groups = groups.groups.filter((g) => filterGroups.every((k) => g.name === k));
      groups.total = groups.groups.length;
    }
    return groups;
  }

  async getGroup(id: string) {
    return this.authzClient.getGroup({ groupId: id });
  }

  async getUserGroups(id: string) {
    return this.authzClient.getUserGroups({ userId: id });
  }

  async getGroupOwners(id: string, onlyIds: boolean = false): Promise<string[] | User[]> {
    const groups = await this.getNestedGroups(id, ['OWNER']);
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
    return this.authzClient.createGroup({ name, description, members });
  }

  async updateGroup(id: string, name: string, description: string, members?: string[]) {
    return this.authzClient.updateGroup({ _id: id, name, description, members });
  }

  async addNestedGroups(groupId: string, nestedGroupIds: string[]) {
    return this.authzClient.addNestedGroups({ groupId, nestedGroupIds });
  }

  async deleteNestedGroups(groupId: string, nestedGroupIds: string[]) {
    return this.authzClient.deleteNestedGroups({ groupId, nestedGroupIds });
  }

  async addGroupRoles(groupId: string, roleIds: string[]) {
    return this.authzClient.addGroupRoles({ groupId, roleIds });
  }

  async getPermissions() {
    return this.authzClient.getPermissions();
  }

  async createPermission(name: string, description: string, applicationId: string, applicationType: string = 'client') {
    return this.authzClient.createPermission({ name, description, applicationId, applicationType });
  }

  async deletePermission(permissionId: string) {
    return this.authzClient.deletePermission({ permissionId });
  }

  async getRole(roleId: string) {
    return this.authzClient.getRole({ roleId });
  }

  async getRoles() {
    return this.authzClient.getRoles();
  }

  async createRole(
    name: string,
    description: string,
    applicationId: string,
    permissions: string[] = [],
    applicationType: string = 'client'
  ) {
    return this.authzClient.createRole({ name, description, applicationId, applicationType, permissions });
  }

  async updateRole(
    id: string,
    name: string,
    description: string,
    applicationId: string,
    permissions: string[],
    applicationType: string = 'client'
  ) {
    return this.authzClient.updateRole({
      _id: id,
      name,
      description,
      applicationId,
      applicationType,
      permissions,
    });
  }

  async addUserToRoles(userId: string, roleIds: string[]) {
    return this.authzClient.addUserToRoles({ userId, roleIds });
  }

  async removeUserFromRoles(userId: string, roleIds: string[]) {
    return this.authzClient.removeUserFromRoles({ userId, roleIds });
  }

  async deleteRole(roleId: string) {
    return this.authzClient.deleteRole({ roleId });
  }

  async getAllNestedGroups(groupId: string, filterGroups: GroupType[] = [], excludeGroups: GroupType[] = []) {
    let nestedGroups = await this.authzClient.getNestedGroups({ groupId });
    if (filterGroups.length) {
      nestedGroups = nestedGroups.filter((g) => filterGroups.every((k) => g.name.endsWith(k)));
    }
    return nestedGroups.filter((r) => excludeGroups.every((k) => !r.name.endsWith(k)));
  }

  async getNestedGroups(groupId: string, filterGroups: GroupType[] = [], excludeGroups: GroupType[] = []) {
    const exclude: GroupType[] = ['PUBLIC'];
    exclude.push(...excludeGroups);
    return this.getAllNestedGroups(groupId, filterGroups, exclude);
  }

  async getNestedGroupMembers(groupId: string, page: number = 1, perPage: number = 10) {
    const { nested, total } = await this.authzClient.getNestedGroupMembers({ groupId }, { page, perPage });
    return { docs: nested, total };
  }

  async getNestedGroupRoles(groupId: string) {
    return this.authzClient.getNestedGroupRoles({ groupId });
  }

  async calculateGroupMemberships(userId: string) {
    return this.authzClient.calculateGroupMemberships({ userId });
  }

  async addGroupMembers(groupId: string, userIds: string[]) {
    return this.authzClient.addGroupMembers({ groupId, userIds });
  }

  async deleteGroupMembers(groupId: string, userIds: string[]) {
    return this.authzClient.deleteGroupMembers({ groupId, userIds });
  }

  async deleteGroup(groupId: string) {
    return this.authzClient.deleteGroup({ groupId });
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
