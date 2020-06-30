import { Handler } from 'aws-lambda';

import { API_BASE } from '../config';
import { getLogger } from '../logging';
import UserRouter from '../routers/UserRouter';

import { authenticated } from '.';

const logger = getLogger();

export const managementHandler: Handler = authenticated(UserRouter.getAdminRouter(API_BASE));
