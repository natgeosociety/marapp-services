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

import {
  AuthenticationClient,
  CreateUserData,
  ManagementClient,
  UpdateUserData,
  User,
  UserData,
  UserMetadata,
} from 'auth0';
import generatePassword from 'generate-password';
import { get } from 'lodash';

import { AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_DOMAIN, AUTH0_REALM } from '../config/auth0';
import { AlreadyExistsError, PasswordStrengthError, UnauthorizedError, UserNotFoundError } from '../errors';
import { getLogger } from '../logging';

const logger = getLogger();

export interface AuthManagementService {
  getUser(userId: string): Promise<User>;
  getUserByEmail(email: string, raiseError?: boolean): Promise<User>;
  createUser(userData: Partial<UserData>): Promise<User>;
  createPasswordlessUser(userData: Partial<CreateUserData>): Promise<User>;
  getUserInfo(accessToken: string): Promise<any>;
  updateUser(userId: string, userData: UpdateUserData): Promise<User>;
  updateUserMetadata(userId: string, userMetadata: UserMetadata): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  emailChangeRequest(userId: string, newEmail: string): Promise<User>;
  emailChangeCancelRequest(userId: string): Promise<User>;
  emailChangeConfirmationHook(userId: string, tempUserId: string): Promise<boolean>;
  passwordChange(userId: string, currentPassword: string, newPassword: string): Promise<boolean>;
  passwordChangeRequest(userId: string): Promise<boolean>;
  passwordChangeTicket(userId: string, redirectURL: string, TTL?: number): Promise<string>;
  createUserInvite(email: string): Promise<User>;
}

export class Auth0ManagementService implements AuthManagementService {
  mgmtClient: ManagementClient;
  authClient: AuthenticationClient;

  constructor(
    clientId: string = AUTH0_CLIENT_ID,
    clientSecret: string = AUTH0_CLIENT_SECRET,
    domain: string = AUTH0_DOMAIN
  ) {
    const options = { clientId, clientSecret, domain };
    this.mgmtClient = new ManagementClient(options);
    this.authClient = new AuthenticationClient(options);
  }

  async getUser(userId: string): Promise<User> {
    return this.mgmtClient.getUser({ id: userId });
  }

  async getUserByEmail(email: string, raiseError: boolean = true): Promise<User> {
    const users = await this.mgmtClient.getUsersByEmail(email);
    if (users && users.length) {
      if (users.length > 1) {
        logger.error(users);
        throw new UserNotFoundError(`Multiple users found for email: ${email}`, 400);
      }
      return users[0];
    } else {
      if (raiseError) {
        throw new UserNotFoundError(`User not found for email: ${email}`, 404);
      }
    }
  }

  async createUser(userData: Partial<CreateUserData>): Promise<User> {
    return this.mgmtClient.createUser({ ...userData, connection: AUTH0_REALM });
  }

  async createPasswordlessUser(userData: Partial<CreateUserData>): Promise<User> {
    return this.mgmtClient.createUser({ ...userData, connection: 'email' });
  }

  /**
   * Creates the user accounts then invites users to complete the signup process
   * by creating passwords for those accounts.
   * A user invitation is basically a change password link repurposed as an invitation.
   * @param email
   */
  async createUserInvite(email: string): Promise<User> {
    const password = generatePassword.generate({ length: 15, numbers: true, symbols: true });

    const newUser = await this.createUser({ email, password, email_verified: true });
    const newUserId = get(newUser, 'user_id');

    await this.passwordChangeRequest(newUserId);

    return newUser;
  }

  async getUserInfo(accessToken: string): Promise<any> {
    return this.authClient.getProfile(accessToken);
  }

  async updateUserMetadata(userId: string, userMetadata: UserMetadata): Promise<User> {
    return this.mgmtClient.updateUserMetadata({ id: userId }, userMetadata);
  }

  async updateUser(userId: string, userData: UpdateUserData): Promise<User> {
    return this.mgmtClient.updateUser({ id: userId }, userData);
  }

  async deleteUser(userId: string): Promise<void> {
    return this.mgmtClient.deleteUser({ id: userId });
  }

  /**
   * Issues an email change request.
   * A confirmation email will be sent to the newEmail with an accessToken for
   * the newly created passwordless user.
   * @param userId
   * @param newEmail
   */
  async emailChangeRequest(userId: string, newEmail: string): Promise<User> {
    let user = await this.getUser(userId);
    if (user.email === newEmail) return user;

    let tempUser = await this.getUserByEmail(newEmail, false);
    const pendingUserId = user?.user_metadata?.pendingUserId;

    if (tempUser) {
      const isValid = this.checkCustomClaims(tempUser, user);
      if (!isValid) {
        throw new AlreadyExistsError('Email address is already registered.', 400);
      }
      logger.debug(`re-send email change confirmation for: ${tempUser.email}`);

      await this.authClient.requestMagicLink({ email: tempUser.email, authParams: {} });
    } else {
      // new change request, removing old temporary user;
      if (pendingUserId) {
        const pendingUserEmail = user?.user_metadata?.pendingUserEmail;
        logger.debug(`removing temporary passwordless user: ${pendingUserEmail}`);

        await this.deleteUser(pendingUserId);
      }

      const tempUserMeta = {
        originalUserId: user?.user_id,
        originalUserEmail: user?.email,
        email: newEmail,
        createdAt: new Date(),
      };
      tempUser = await this.createPasswordlessUser({
        email: newEmail,
        user_metadata: tempUserMeta,
      });

      const userMeta = {
        pendingUserId: tempUser?.user_id,
        pendingUserEmail: tempUser?.email,
      };
      user = await this.updateUserMetadata(user.user_id, userMeta);
    }
    return user;
  }

  /**
   * Cancels the email change request.
   * Invalidates the confirmation email by removing the passwordless user.
   * @param userId
   */
  async emailChangeCancelRequest(userId: string): Promise<User> {
    let user = await this.getUser(userId);

    const pendingUserId = user?.user_metadata?.pendingUserId;
    const pendingUserEmail = user?.user_metadata?.pendingUserEmail;

    // cancel email change request, removing temporary passwordless user;
    if (pendingUserId) {
      logger.debug(`removing temporary passwordless user: ${pendingUserEmail}`);

      await this.deleteUser(pendingUserId);

      // update the user metadata on the original user;
      const userMeta = { ...user.user_metadata, pendingUserId: null, pendingUserEmail: null };

      user = await this.updateUser(user.user_id, { user_metadata: userMeta });
    }
    return user;
  }

  /**
   * Email change request confirmation hook.
   * Requires both the initial user and the authorized temporary (passwordless)
   * user to successfully confirm & update the email.
   * @param userId
   * @param tempUserId
   */
  async emailChangeConfirmationHook(userId: string, tempUserId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    const tempUser = await this.getUser(tempUserId);

    const isValid = this.checkCustomClaims(tempUser, user);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email change request.', 401);
    }
    let success = true;
    try {
      const newUserEmail = tempUser?.email;
      const userMeta = { ...user.user_metadata, pendingUserId: null, pendingUserEmail: null };

      // update the email address on the original user;
      await this.updateUser(user.user_id, { email: newUserEmail, user_metadata: userMeta });

      // delete the temporary passwordless user account;
      await this.deleteUser(tempUser.user_id);
    } catch (err) {
      logger.error(err);
      success = false;
    }
    return success;
  }

  /**
   * Checks whether the original user and the newly created (passwordless) user are
   * logically linked.
   * If the custom claims do not match, the workflow must be stopped, and treated as an attack
   * (or wrong email) as the new email address may be already used by someone else.
   * @param tempUser
   * @param originalUser
   * @private
   */
  private checkCustomClaims(tempUser: User, originalUser: User): boolean {
    const originalUserId = get(tempUser, 'user_metadata.originalUserId');
    const originalUserEmail = get(tempUser, 'user_metadata.originalUserEmail');

    const pendingUserId = get(originalUser, 'user_metadata.pendingUserId');
    const pendingUserEmail = get(originalUser, 'user_metadata.pendingUserEmail');

    return (
      tempUser.user_id === pendingUserId &&
      tempUser.email === pendingUserEmail &&
      originalUser.user_id === originalUserId &&
      originalUser.email === originalUserEmail
    );
  }

  async passwordChange(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.getUser(userId);

    let success = true;
    await new Promise((resolve, reject) => {
      this.authClient.passwordGrant(
        { username: user.email, password: currentPassword, realm: AUTH0_REALM },
        (err: any) => {
          if (err) {
            success = false;
            if (err?.statusCode === 403) {
              reject(new UnauthorizedError('The current password is incorrect.', 401));
            }
            logger.error(err);
            reject(err);
          }
          resolve();
        }
      );
    });
    await new Promise((resolve, reject) => {
      this.mgmtClient.updateUser({ id: userId }, { password: newPassword }, (err: any) => {
        if (err) {
          success = false;
          if (err?.statusCode === 400) {
            reject(new PasswordStrengthError('Password is too weak.', 400));
          }
          logger.error(err);
          reject(err);
        }
        resolve();
      });
    });
    return success;
  }

  /**
   * Request a change password email using a database or active directory service.
   * @param userId
   */
  async passwordChangeRequest(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);

    let success = true;
    try {
      await this.authClient.requestChangePasswordEmail({ email: user.email, connection: AUTH0_REALM });
    } catch (err) {
      logger.error(err);
      success = false;
    }
    return success;
  }

  /**
   * Create a new password change ticket.
   * Does not send an email to the user.
   * @param userId
   * @param redirectURL
   * @param TTL
   */
  async passwordChangeTicket(userId: string, redirectURL: string, TTL: number = 3600): Promise<string> {
    const { ticket } = await this.mgmtClient.createPasswordChangeTicket({
      user_id: userId,
      result_url: redirectURL,
      ttl_sec: TTL,
      mark_email_as_verified: true,
    });
    return ticket;
  }
}
