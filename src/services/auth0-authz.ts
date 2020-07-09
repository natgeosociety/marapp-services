import { AuthorizationClient } from '@natgeosociety/auth0-authorization';
import { get, set } from 'lodash';
import makeError from 'make-error';

import { AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_DOMAIN, AUTH0_EXTENSION_URL } from '../config/auth0';
import { getLogger } from '../logging';

export const Auth0Error = makeError('Auth0Error');

const logger = getLogger();

export interface AuthzService {
  getGroups();
  getGroup(id: string);
  createGroup(name: string, description: string, members?: string[]);
  updateGroup(id: string, name: string, description: string);
  addNestedGroups(groupId: string, nestedGroupIds: string[]);
  addGroupRoles(groupId: string, roleIds: string[]);
  deleteGroup(groupId: string);
  getPermission();
  createPermission(name: string, description: string, applicationId: string, applicationType?: string);
  deletePermission(permissionId: string);
  getRoles();
  createRole(
    name: string,
    description: string,
    applicationId: string,
    permissions?: string[],
    applicationType?: string
  );
  deleteRole(roleId: string);
  calculateGroupMemberships(groupId: string);
  getNestedGroups(groupId: string);
  getNestedGroupMembers(groupId: string, page?: number, perPage?: number);
  getNestedGroupRoles(groupId: string);
  mapNestedGroupRoles(nestedGroupRoles: any[]);
  findPrimaryGroupId(groupMembership: any[], primaryGroupName: string);
  addGroupMembers(groupId: string, userIds: string[]);
  deleteGroupMembers(groupId: string, userIds: string[]);
}

export class Auth0AuthzService implements AuthzService {
  constructor(private client: AuthorizationClient) {}

  async getGroups() {
    return this.client.getGroups();
  }

  async getGroup(id: string) {
    return this.client.getGroup({ groupId: id });
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

  async deleteRole(roleId: string) {
    return this.client.deleteRole({ roleId });
  }

  async getNestedGroups(groupId: string) {
    return this.client.getNestedGroups({ groupId });
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
