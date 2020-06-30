import { Handler } from 'aws-lambda';

import { API_BASE } from '../config';
import { getLogger } from '../logging';
import LocationRouter from '../routers/LocationRouter';

import { authenticated } from '.';

const logger = getLogger();

export const openHandler: Handler = authenticated(LocationRouter.getRouter(API_BASE));

export const managementHandler: Handler = authenticated(LocationRouter.getAdminRouter(API_BASE));
