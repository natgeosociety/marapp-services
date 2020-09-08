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

import { Auth0AuthzService } from '../src/services/auth0-authz';
import { Auth0ManagementService } from '../src/services/auth0-management';
import { MembershipService } from '../src/services/membership-service';

const argv = yargs.options({
  createGroup: { type: 'string' },
  updateGroupsConfig: { type: 'boolean', default: false },
  getAllGroups: { type: 'boolean', default: false },
  getAllPermissions: { type: 'boolean', default: false },
  getAllRoles: { type: 'boolean', default: false },
  ownerEmail: { type: 'string' },
}).argv;

const main = async (): Promise<void> => {
  const authzService = new Auth0AuthzService();
  const authMgmtService = new Auth0ManagementService();

  const membershipService = new MembershipService(authzService);

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
  if (argv.createGroup && argv.createGroup.trim() && argv.ownerEmail && argv.ownerEmail.trim()) {
    const user = await authMgmtService.getUserByEmail(argv.ownerEmail);
    if (!user) {
      throw Error(`No user found for the provided owner: ${argv.ownerEmail}`);
    }
    await membershipService.createOrganization(argv.createGroup.trim(), argv.createGroup.trim(), [user.user_id]);
  }
  if (argv.updateGroupsConfig) {
    await membershipService.updateOrganizationConfig();
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
