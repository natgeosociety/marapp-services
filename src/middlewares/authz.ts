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

import { Handler, NextFunction, Request, Response } from 'express';
import { get, isArray, isString, set } from 'lodash';

import { PUBLIC_ORG } from '../config';
import { UnauthorizedError } from '../errors';
import { getLogger } from '../logging';

const logger = getLogger();

interface GuardOptions {
  reqIdentityKey?: string;
  reqGroupKey?: string;
  jwtGroupKey?: string;
  jwtPermissionKey?: string;
}

export class AuthzGuard {
  readonly defaults: GuardOptions = {
    reqIdentityKey: 'identity',
    reqGroupKey: 'groups',
    jwtGroupKey: 'groups',
    jwtPermissionKey: 'permissions',
  };
  readonly options: GuardOptions;

  constructor(options?: GuardOptions) {
    this.options = Object.assign({}, this.defaults, options);
  }

  /**
   * Middleware which validates a JWTs `scope` to authorize access to a resource.
   *
   * The JWT must have a `scope` claim and it must either be a string of space-separated
   * permissions or an array of strings.
   * @param required
   */
  public enforce(required: string | string[] | string[][]): Handler {
    let scopes: string[][];

    if (isString(required)) {
      scopes = [[required]];
      // @ts-ignore
    } else if (isArray(required) && required.every(isString)) {
      scopes = [<string[]>required];
    } else {
      scopes = <string[][]>required;
    }

    return (req: Request, res: Response, next: NextFunction) => {
      logger.debug(`evaluating scopes: ${scopes.join(', ')}`);

      const { isAnonymousAllowed, isServiceAccount } = res.locals;

      if (isServiceAccount) {
        logger.debug('service account, skipping authz checks');
        return next();
      }

      const identity = get(req, this.options.reqIdentityKey);
      if (!identity) {
        if (isAnonymousAllowed) {
          logger.debug('anonymous account, skipping authz checks');
          return next();
        }
        return next(new UnauthorizedError('Permission denied. Anonymous access not allowed.', 401));
      }
      const groups: string[] = get(req, this.options.reqGroupKey, []);

      let permissions: string | string[] = get(identity, this.options.jwtPermissionKey);
      if (!permissions) {
        return next(new UnauthorizedError('Permission denied. Scope/permission not included in token', 403));
      }
      if (isString(permissions)) {
        permissions = permissions.split(' ');
      } else if (!Array.isArray(permissions)) {
        return next(new UnauthorizedError('Permission denied. Invalid scope/permission included in token', 403));
      }
      logger.debug(`token scopes/permissions: ${permissions.join(', ')}`);

      // when the user has "special" permissions, include a "wildcard" group
      if (permissions.find((permission) => permission.startsWith('*:'))) {
        groups.push('*');
      }

      const scopedGroups = groups.filter((group: string) => {
        const hasAccess = scopes.some((required: string[]) => {
          return required.every((permission: string) => {
            const scoped = [group, permission].join(':'); // prefix rules by group;
            logger.debug(`evaluated scope/permission: ${scoped}`);

            return permissions.includes(scoped);
          });
        });
        return hasAccess;
      });

      if (!scopedGroups.length) {
        return next(new UnauthorizedError('Permission denied. Insufficient permissions for this resource', 403));
      }
      set(req, this.options.reqGroupKey, scopedGroups); // filter groups with access rights;

      next();
    };
  }

  /**
   * Middleware which enforces a primary group for the user, from the primary groups
   * found in JWTs `group`.
   *
   * The JWT must have a `group` claim and it must either be a string of space-separated
   * groups or an array of strings.
   *
   * @param includeServiceAccounts: require a primary group for operations with Service Accounts (apiKeys).
   * @param allowMultiple: allow multiple groups delimited by sep.
   * @param sep: group value separator.
   */
  public enforcePrimaryGroup(
    includeServiceAccounts: boolean = false,
    allowMultiple: boolean = false,
    sep: string = ','
  ): Handler {
    return (req: Request, res: Response, next: NextFunction) => {
      const { isAnonymousAllowed, isServiceAccount } = res.locals;

      if (isServiceAccount) {
        if (includeServiceAccounts) {
          if (!req.query.group) {
            return next(
              new UnauthorizedError('Permission denied. Service accounts need to specify a primary group.', 403)
            );
          }
          const groups: string[] = (req.query.group as string).split(sep);
          set(req, this.options.reqGroupKey, groups);
        }
        return next();
      }

      const identity = get(req, this.options.reqIdentityKey);
      if (!identity) {
        if (isAnonymousAllowed) {
          logger.debug(`anonymous user, setting public group: ${PUBLIC_ORG}`);

          set(req, this.options.reqGroupKey, [PUBLIC_ORG]);
          return next();
        }
        return next(new UnauthorizedError('Permission denied. Anonymous access not allowed.', 401));
      }

      let tokenGroups: string | string[] = get(identity, this.options.jwtGroupKey);
      if (!tokenGroups) {
        return next(new UnauthorizedError('Permission denied. Groups not included in token', 403));
      }

      if (isString(tokenGroups)) {
        tokenGroups = tokenGroups.split(' ');
      } else if (!Array.isArray(tokenGroups)) {
        return next(new UnauthorizedError('Permission denied. Invalid groups included in token', 403));
      }
      const primaryGroups = this.removeNestedGroups(tokenGroups);
      if (!primaryGroups.length) {
        return next(new UnauthorizedError('Permission denied. No primary groups found for user', 403));
      }
      logger.debug(`token primary groups: ${primaryGroups.join(', ')}`);

      if (!req.query.group) {
        return next(new UnauthorizedError('Permission denied. No primary groups specified for user', 403));
      }
      const groups: string[] = (req.query.group as string).split(sep);
      if (!groups.every((group) => primaryGroups.includes(group))) {
        return next(new UnauthorizedError('Permission denied. Invalid primary groups specified for user', 403));
      }
      if (!allowMultiple && groups.length > 1) {
        return next(new UnauthorizedError('Permission denied. Multiple primary groups specified for user', 403));
      }
      set(req, this.options.reqGroupKey, groups);

      next();
    };
  }

  /**
   * Remove nested groups (children) from groups.
   * Nested groups are prefixed with the group label.
   * @param groups
   */
  private removeNestedGroups = (groups: string[]): string[] => {
    if (groups.length) {
      return groups.filter((group: string) => {
        return groups.filter((g: string) => g.includes(group)).length >= 2;
      });
    }
    return [];
  };
}
