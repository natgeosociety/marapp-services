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

enum ScopesEnum {
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
  readUsersGuard: guard.enforce([[ScopesEnum.ReadUsers], [ScopesEnum.ReadAll]]),
  writeUsersGuard: guard.enforce([[ScopesEnum.WriteUsers], [ScopesEnum.WriteAll]]),
};
