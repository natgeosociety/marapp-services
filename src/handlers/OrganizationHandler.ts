import { Handler } from 'aws-lambda';

import { API_BASE } from '../config';
import { getLogger } from '../logging';
import OrganizationRouter from '../routers/OrganizationRouter';

import { authenticated } from '.';

const logger = getLogger();

export const managementHandler: Handler = authenticated(OrganizationRouter.getAdminRouter(API_BASE));
