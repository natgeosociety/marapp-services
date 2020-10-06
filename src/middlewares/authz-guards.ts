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

import { Request } from 'express';

import { JWT_GROUP_KEY, JWT_PERMISSION_KEY } from '../config';

import { AuthzGuard } from './authz';

interface JWTPayload {
  sub: string;
  [key: string]: any; // allow additional properties;
}

export interface AuthzRequest extends Request {
  identity: JWTPayload; // JWT payload;
  groups: string[]; // primary groups;
}

export const guard = new AuthzGuard({
  reqIdentityKey: 'identity',
  reqGroupKey: 'groups',
  jwtGroupKey: JWT_GROUP_KEY,
  jwtPermissionKey: JWT_PERMISSION_KEY,
});

export const enum ScopesEnum {
  ReadAll = 'read:*',
  WriteAll = 'write:*',
  ReadLocations = 'read:locations',
  WriteLocations = 'write:locations',
  ReadMetrics = 'read:metrics',
  WriteMetrics = 'write:metrics',
  ReadCollections = 'read:collections',
  WriteCollections = 'write:collections',
  ReadLayers = 'read:layers',
  WriteLayers = 'write:layers',
  ReadWidgets = 'read:widgets',
  WriteWidgets = 'write:widgets',
  ReadDashboards = 'read:dashboards',
  WriteDashboards = 'write:dashboards',
  ReadUsers = 'read:users',
  WriteUsers = 'write:users',
  ReadOrganizations = 'read:organizations',
  WriteOrganizations = 'write:organizations',
  ReadStats = 'read:stats',
}

export const AuthzGuards = {
  readAllGuard: guard.enforce([ScopesEnum.ReadAll]),
  writeAllGuard: guard.enforce([ScopesEnum.WriteAll]),
  readLocationsGuard: guard.enforce([[ScopesEnum.ReadLocations], [ScopesEnum.ReadAll]]),
  writeLocationsGuard: guard.enforce([[ScopesEnum.WriteLocations], [ScopesEnum.WriteAll]]),
  readMetricsGuard: guard.enforce([[ScopesEnum.ReadMetrics], [ScopesEnum.ReadAll]]),
  writeMetricsGuard: guard.enforce([[ScopesEnum.WriteMetrics], [ScopesEnum.WriteAll]]),
  readCollectionsGuard: guard.enforce([[ScopesEnum.ReadCollections], [ScopesEnum.ReadAll]]),
  writeCollectionsGuard: guard.enforce([[ScopesEnum.WriteCollections], [ScopesEnum.WriteAll]]),
  readLayersGuard: guard.enforce([[ScopesEnum.ReadLayers], [ScopesEnum.ReadAll]]),
  writeLayersGuard: guard.enforce([[ScopesEnum.WriteLayers], [ScopesEnum.WriteAll]]),
  readWidgetsGuard: guard.enforce([[ScopesEnum.ReadWidgets], [ScopesEnum.ReadAll]]),
  writeWidgetsGuard: guard.enforce([[ScopesEnum.WriteWidgets], [ScopesEnum.WriteAll]]),
  readDashboardsGuard: guard.enforce([[ScopesEnum.ReadDashboards], [ScopesEnum.ReadAll]]),
  writeDashboardsGuard: guard.enforce([[ScopesEnum.WriteDashboards], [ScopesEnum.WriteAll]]),
  readUsersGuard: guard.enforce([[ScopesEnum.ReadUsers]]),
  writeUsersGuard: guard.enforce([[ScopesEnum.WriteUsers]]),
  readOrganizationsGuard: guard.enforce([ScopesEnum.ReadOrganizations]),
  writeOrganizationsGuard: guard.enforce([ScopesEnum.WriteOrganizations]),
  readStatsGuard: guard.enforce([[ScopesEnum.ReadStats], [ScopesEnum.ReadAll]]),
};
