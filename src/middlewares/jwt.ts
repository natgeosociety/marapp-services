import { Errback, NextFunction, Request, Response } from 'express';
import jwt from 'express-jwt';
import jwksRsa from 'jwks-rsa';

import { SERVICE_API_KEY } from '../config';
import { AUTH0_DOMAIN } from '../config/auth0';
import { UnauthorizedError } from '../errors';
import { getLogger } from '../logging';

const logger = getLogger();

let jwksRsaClient;

/**
 * Extract the JWT from the Authorization header.
 * @param req
 */
const getToken = (req: Request) => {
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    return req.query.token;
  }
  return null;
};

/**
 * Extract the apiKey from the ApiKey header.
 * @param req
 */
const getApiKey = (req: Request): string => {
  if (req.headers.apikey) {
    return <string>req.headers.apikey;
  }
  return null;
};

/**
 * Validate apiKey against known secret(s).
 * @param apiKey
 */
const isValidApiKey = (apiKey: string): boolean => {
  return apiKey && apiKey.trim() === SERVICE_API_KEY.trim();
};

/**
 * RSA signing keys provider.
 * @param req
 * @param header
 * @param payload
 * @param cb
 */
const secretProvider = (req, header, payload, cb) => {
  // Only RS256 is supported.
  if (!header || header.alg !== 'RS256') {
    return cb(null, null);
  }
  if (!jwksRsaClient) {
    jwksRsaClient = jwksRsa({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
    });
  }
  jwksRsaClient.getSigningKey(header.kid, (err, key) => {
    if (err) {
      logger.error(err);
      return cb(err, null);
    }
    // Provide the key.
    return cb(null, key.publicKey || key.rsaPublicKey);
  });
};

/**
 * Middleware that validates a JsonWebToken (JWT) and sets a property on the request
 * with the decoded attributes.
 *
 * RSA signing keys are obtained from a JWKS (JSON Web Key Set) endpoint.
 *
 * Signing key verification results are cached in order to prevent excessive HTTP requests to the JWKS endpoint
 */
export const jwtRSA = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = getApiKey(req);
  if (apiKey && isValidApiKey(apiKey)) {
    res.locals.isServiceAccount = true; // forward response local variables scoped to the request;
    return next();
  }
  const options = {
    userProperty: 'identity',
    secret: secretProvider,
    algorithms: ['RS256'],
    issuer: `https://${AUTH0_DOMAIN}/`,
    credentialsRequired: true,
    getToken: getToken,
  };
  return jwt(options)(req, res, next);
};

/**
 * The default behavior is to throw an error when the token is invalid.
 * Catch the error and throw a custom error message.
 */
export const jwtError = (err: Errback, req: Request, res: Response, next: NextFunction) => {
  if (err.name === 'UnauthorizedError') {
    throw new UnauthorizedError('Invalid JWT Token', 401);
  }
};

/**
 * Middleware that validates an ApiKey. Used for system only requests.
 * @param req
 * @param res
 * @param next
 */
export const apiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = getApiKey(req);
  if (apiKey && isValidApiKey(apiKey)) {
    res.locals.isServiceAccount = true; // forward response local variables scoped to the request;
    return next();
  }
  throw new UnauthorizedError('Invalid API Key', 401);
};
