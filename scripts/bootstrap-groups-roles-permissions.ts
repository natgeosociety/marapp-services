#!/usr/bin/env ts-node --files

import chalk from 'chalk';
import { get } from 'lodash';
import yargs from 'yargs';

import { forEachAsync } from '../src/helpers/util';
import { Auth0AuthzService, initAuthzClient } from '../src/services/auth0-authz';
import { Auth0ManagementService, initAuthMgmtClient } from '../src/services/auth0-management';

const argv = yargs.options({
  createGroup: { type: 'string' },
  getAllGroups: { type: 'boolean', default: false },
  getAllPermissions: { type: 'boolean', default: false },
  getAllRoles: { type: 'boolean', default: false },
  applicationId: { type: 'string', demandOption: true },
  userEmail: { type: 'string' },
  groupId: { type: 'string' },
}).argv;

const SCOPES_READ = [
  'read:*',
  'read:locations',
  'read:metrics',
  'read:collections',
  'read:layers',
  'read:widgets',
  'read:dashboards',
  'read:users',
];
const SCOPES_READ_DESCRIPTION = 'Reading the full information about a single resource inside an organization.';

const SCOPES_WRITE = [
  'write:*',
  'write:locations',
  'write:metrics',
  'write:collections',
  'write:layers',
  'write:widgets',
  'write:dashboards',
  'write:users',
];
const SCOPES_WRITE_DESCRIPTION =
  'Modifying the resource in any way e.g. creating, editing, or deleting inside an organization.';

type Permission = { name: string; readScopes: string[]; writeScopes: string[]; description: string };

const PERMISSIONS: { [key: string]: Permission } = {
  admin: {
    name: 'Admin',
    readScopes: ['read:*'],
    writeScopes: ['write:*'],
    description: 'Full power over the assets managed by an organization.',
  },
  editor: {
    name: 'Editor',
    readScopes: [
      'read:locations',
      'read:metrics',
      'read:collections',
      'read:layers',
      'read:widgets',
      'read:dashboards',
    ],
    writeScopes: [
      'write:locations',
      'write:metrics',
      'write:collections',
      'write:layers',
      'write:widgets',
      'write:dashboards',
    ],
    description: 'Full content permission across the entire organization.',
  },
  viewer: {
    name: 'Viewer',
    readScopes: [
      'read:locations',
      'read:metrics',
      'read:collections',
      'read:layers',
      'read:widgets',
      'read:dashboards',
    ],
    writeScopes: [],
    description: 'Can view content managed by the organization',
  },
};

const main = async (): Promise<void> => {
  const authMgmtClient = await initAuthMgmtClient();
  const authMgmtService = new Auth0ManagementService(authMgmtClient);

  const authzClient = await initAuthzClient();
  const authzService = new Auth0AuthzService(authzClient);

  if (argv.getAllGroups) {
    const groups = await authzService.getGroups();
    console.log(chalk.yellow(JSON.stringify(groups, null, 2)));
  }
  if (argv.getAllPermissions) {
    const permissions = await authzService.getPermission();
    console.log(chalk.yellow(JSON.stringify(permissions, null, 2)));
  }
  if (argv.getAllRoles) {
    const roles = await authzService.getRoles();
    console.log(chalk.yellow(JSON.stringify(roles, null, 2)));
  }

  if (argv.createGroup && argv.createGroup.trim()) {
    const groupName = argv.createGroup.trim().toUpperCase();
    const viewerGroupName = [groupName, 'VIEWER'].join('-');
    const editorGroupName = [groupName, 'EDITOR'].join('-');
    const adminGroupName = [groupName, 'ADMIN'].join('-');

    // create the main group + nested groups;
    const root = await authzService.createGroup(groupName, groupName);
    const admin = await authzService.createGroup(adminGroupName, `${groupName} Admin`);
    const editor = await authzService.createGroup(editorGroupName, `${groupName} Editor`);
    const viewer = await authzService.createGroup(viewerGroupName, `${groupName} Viewer`);

    // add the nested groups under the main group;
    await authzService.addNestedGroups(root._id, [viewer._id, editor._id, admin._id]);

    const permissionMap: { [key: string]: string } = {};

    // create permissions;
    await forEachAsync(SCOPES_READ, async (scope) => {
      const read = [groupName, scope].join(':');
      const permission = await authzService.createPermission(read, SCOPES_READ_DESCRIPTION, argv.applicationId);
      permissionMap[scope] = permission._id;
    });
    await forEachAsync(SCOPES_WRITE, async (scope) => {
      const write = [groupName, scope].join(':');
      const permission = await authzService.createPermission(write, SCOPES_WRITE_DESCRIPTION, argv.applicationId);
      permissionMap[scope] = permission._id;
    });

    // create roles;
    const viewerName = [groupName, PERMISSIONS.viewer.name].join(':');
    const viewerRole = await authzService.createRole(viewerName, PERMISSIONS.viewer.description, argv.applicationId, [
      ...PERMISSIONS.viewer.readScopes.map((scope) => permissionMap[scope]),
      ...PERMISSIONS.viewer.writeScopes.map((scope) => permissionMap[scope]),
    ]);
    const editorName = [groupName, PERMISSIONS.editor.name].join(':');
    const editorRole = await authzService.createRole(editorName, PERMISSIONS.editor.description, argv.applicationId, [
      ...PERMISSIONS.editor.readScopes.map((scope) => permissionMap[scope]),
      ...PERMISSIONS.editor.writeScopes.map((scope) => permissionMap[scope]),
    ]);
    const adminName = [groupName, PERMISSIONS.admin.name].join(':');
    const adminRole = await authzService.createRole(adminName, PERMISSIONS.admin.description, argv.applicationId, [
      ...PERMISSIONS.admin.readScopes.map((scope) => permissionMap[scope]),
      ...PERMISSIONS.admin.writeScopes.map((scope) => permissionMap[scope]),
    ]);

    // add the roles for each of the nested groups;
    await authzService.addGroupRoles(viewer._id, [viewerRole._id]);
    await authzService.addGroupRoles(editor._id, [editorRole._id]);
    await authzService.addGroupRoles(admin._id, [adminRole._id]);
  }

  if (argv.userEmail && argv.userEmail.trim() && argv.groupId && argv.groupId.trim()) {
    const user = await authMgmtService.getUserByEmail(argv.userEmail);
    const userId = get(user, 'user_id');

    await authzService.addGroupMembers(argv.groupId, [userId]);
  }
};

main()
  .then(() => console.debug('Success!'))
  .catch((err) => console.error(err));
