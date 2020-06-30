/**
 * Rules are code snippets written in JavaScript that are executed as part of the authentication
 * pipeline in Auth0. This happens every time a user authenticates to an application.
 * See: https://auth0.com/docs/rules
 *
 * Add role-based access control claims in the JWT bearer token.
 *
 * Requires the following variable stored via the global configuration object:
 *  AUTHZ_EXT_ALLOWED_CLIENT_IDS = <CLIENT-ID1>,<CLIENT-ID2>,...
 */
function A(user, context, callback) {
  const CLIENT_ID = context.clientID;
  const AUTHZ_EXT_ALLOWED_CLIENT_IDS = configuration.AUTHZ_EXT_ALLOWED_CLIENT_IDS;

  const ALLOWED_CLIENT_IDS = AUTHZ_EXT_ALLOWED_CLIENT_IDS ? AUTHZ_EXT_ALLOWED_CLIENT_IDS.split(',') : [];

  // Exclude clients not registered via the global config object;
  if (!ALLOWED_CLIENT_IDS.includes(CLIENT_ID)) {
    return callback(null, user, context);
  }

  // Auth0 will enforce namespacing when performing OIDC-conformant
  // login flows, meaning that any custom claims without HTTP/HTTPS
  // namespaces will be silently excluded from tokens.
  const namespace = 'https://marapp.org/';

  context.idToken[namespace + 'permissions'] = user.permissions;
  context.idToken[namespace + 'groups'] = user.groups;
  context.idToken[namespace + 'roles'] = user.roles;

  context.accessToken[namespace + 'permissions'] = user.permissions;
  context.accessToken[namespace + 'groups'] = user.groups;
  context.accessToken[namespace + 'roles'] = user.roles;

  callback(null, user, context);
}
