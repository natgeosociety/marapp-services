import { ManagementClient } from 'auth0';
import { get } from 'lodash';
import makeError from 'make-error';

import { AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_DOMAIN } from '../config/auth0';
import { UserNotFoundError } from '../errors';
import { getLogger } from '../logging';

export const Auth0Error = makeError('Auth0Error');

const logger = getLogger();

export interface AuthManagementService {
  getUserByEmail(email: string);
  createUser(email: string);
}

export class Auth0ManagementService implements AuthManagementService {
  constructor(private client: ManagementClient) {}

  async getUserByEmail(email: string) {
    const users = await this.client.getUsersByEmail(email);
    if (users && users.length) {
      if (users.length > 1) {
        throw new UserNotFoundError(`Multiple users found for email: ${email}`, 400);
      }
      return users[0];
    } else {
      throw new UserNotFoundError(`User not found for email: ${email}`, 404);
    }
  }

  async createUser(email: string) {
    throw new Error('not implemented');
  }
}

/**
 * Auth0 Authorization Extension API client library.
 */
export const initAuthMgmtClient = (): Promise<ManagementClient> => {
  return new Promise((resolve, reject) => {
    logger.info('Initializing the Auth0 Management client');

    try {
      const managementClient = new ManagementClient({
        clientId: AUTH0_CLIENT_ID,
        clientSecret: AUTH0_CLIENT_SECRET,
        domain: AUTH0_DOMAIN,
        scope: 'read:users update:users',
      });
      logger.warn('Auth0 Management client initialized successfully');

      resolve(managementClient);
    } catch (err) {
      logger.error(err);
      throw new Auth0Error(`Auth0 connection error. Failed to authenticate with client: ${AUTH0_CLIENT_ID}`);
    }
  });
};
