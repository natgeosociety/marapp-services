import { Handler } from 'aws-lambda';

import { API_BASE } from '../config';
import { getLogger } from '../logging';
import DashboardRouter from '../routers/DashboardRouter';

import { authenticated } from '.';

const logger = getLogger();

export const openHandler: Handler = authenticated(DashboardRouter.getRouter(API_BASE));

export const managementHandler: Handler = authenticated(DashboardRouter.getAdminRouter(API_BASE));
