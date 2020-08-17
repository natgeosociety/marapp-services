#!/usr/bin/env ts-node --files

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

import * as chalk from 'chalk';
import * as yargs from 'yargs';

import { forEachAsync } from '../src/helpers/util';
import { Auth0AuthzService, initAuthzClient } from '../src/services/auth0-authz';
import { Auth0ManagementService, initAuthMgmtClient } from '../src/services/auth0-management';

const argv = yargs.options({
  createGroup: { type: 'string' },
  upsertGroupsConfig: { type: 'boolean', default: false },
  getAllGroups: { type: 'boolean', default: false },
  getAllPermissions: { type: 'boolean', default: false },
  getAllRoles: { type: 'boolean', default: false },
  applicationId: { type: 'string', demandOption: true },
  ownerEmail: { type: 'string' },
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
  owner: {
    name: 'Owner',
    readScopes: ['read:*'],
    writeScopes: ['write:*'],
    description: 'Complete power over the assets managed by an organization.',
  },
  admin: {
    name: 'Admin',
    readScopes: ['read:*'],
    writeScopes: ['write:*'],
    description: 'Power over the assets managed by an organization.',
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

  if (argv.upsertGroupsConfig) {
    const { groups } = await authzService.getGroups();
    const primaryGroups = groups.filter((group) => 'nested' in group);

    const { permissions } = await authzService.getPermission();
    const existingPermissionsMap = permissions.reduce((a, c) => {
      a[c.name] = c;
      return a;
    }, {});

    const nestedGroups = Object.keys(PERMISSIONS).map((p) => ({ name: PERMISSIONS[p].name, key: p }));

    for (const primaryGroup of primaryGroups) {
      for (const nestedGroup of nestedGroups) {
        const nestedGroupName = [primaryGroup.name, nestedGroup.name.toUpperCase()].join('-');

        // check for the missing nested groups;
        if (!groups.find((group) => group.name === nestedGroupName)) {
          // create the missing nested group;
          const missingNestedGroup = await authzService.createGroup(
            nestedGroupName,
            `${primaryGroup.name} ${nestedGroup.name}`
          );

          await authzService.addNestedGroups(primaryGroup._id, [missingNestedGroup._id]);

          const permissionMap: { [key: string]: string } = {};

          // create the missing permissions;
          await forEachAsync(SCOPES_READ, async (scope) => {
            const read = [primaryGroup.name, scope].join(':');
            const permission =
              existingPermissionsMap[read] ||
              (await authzService.createPermission(read, SCOPES_READ_DESCRIPTION, argv.applicationId));
            permissionMap[scope] = permission._id;
          });

          await forEachAsync(SCOPES_WRITE, async (scope) => {
            const write = [primaryGroup.name, scope].join(':');
            const permission =
              existingPermissionsMap[write] ||
              (await authzService.createPermission(write, SCOPES_WRITE_DESCRIPTION, argv.applicationId));
            permissionMap[scope] = permission._id;
          });

          // create the missing role;
          const missingRoleName = [primaryGroup.name, nestedGroup.name].join(':');
          const missingRole = await authzService.createRole(
            missingRoleName,
            PERMISSIONS[nestedGroup.key].description,
            argv.applicationId,
            [
              ...PERMISSIONS[nestedGroup.key].readScopes.map((scope) => permissionMap[scope]),
              ...PERMISSIONS[nestedGroup.key].writeScopes.map((scope) => permissionMap[scope]),
            ]
          );

          // add the role for the missing nested group;
          await authzService.addGroupRoles(missingNestedGroup._id, [missingRole._id]);
        }
      }
    }
  }

  if (argv.createGroup && argv.createGroup.trim() && argv.ownerEmail && argv.ownerEmail.trim()) {
    const user = await authMgmtService.getUserByEmail(argv.ownerEmail);

    if (!user) {
      console.error(`No user found for the provided owner (${argv.ownerEmail}).`);

      return;
    }

    const groupName = argv.createGroup.trim().toUpperCase();
    const viewerGroupName = [groupName, 'VIEWER'].join('-');
    const editorGroupName = [groupName, 'EDITOR'].join('-');
    const adminGroupName = [groupName, 'ADMIN'].join('-');
    const ownerGroupName = [groupName, 'OWNER'].join('-');

    // create the main group + nested groups;
    const root = await authzService.createGroup(groupName, groupName);
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
    const ownerName = [groupName, PERMISSIONS.owner.name].join(':');
    const ownerRole = await authzService.createRole(ownerName, PERMISSIONS.owner.description, argv.applicationId, [
      ...PERMISSIONS.owner.readScopes.map((scope) => permissionMap[scope]),
      ...PERMISSIONS.owner.writeScopes.map((scope) => permissionMap[scope]),
    ]);

    // add the roles for each of the nested groups;
    await authzService.addGroupRoles(viewer._id, [viewerRole._id]);
    await authzService.addGroupRoles(editor._id, [editorRole._id]);
    await authzService.addGroupRoles(admin._id, [adminRole._id]);
    await authzService.addGroupRoles(owner._id, [ownerRole._id]);

    // set owner;
    await authzService.addGroupMembers(owner._id, [user.user_id]);
  }
};

main()
  .then(() => {
    console.debug('Success!');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
