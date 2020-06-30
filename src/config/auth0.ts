import { requireEnv } from '../helpers/util';

export const AUTH0_CLIENT_ID = requireEnv('AUTH0_CLIENT_ID');
export const AUTH0_CLIENT_SECRET = requireEnv('AUTH0_CLIENT_SECRET');
export const AUTH0_DOMAIN = requireEnv('AUTH0_DOMAIN');
export const AUTH0_EXTENSION_URL = requireEnv('AUTH0_EXTENSION_URL');
