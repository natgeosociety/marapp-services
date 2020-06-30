import { Handler } from 'aws-lambda';

import { API_BASE } from '../config';
import { getLogger } from '../logging';
import MetricRouter from '../routers/MetricRouter';

import { authenticated } from '.';

const logger = getLogger();

export const openHandler: Handler = authenticated(MetricRouter.getRouter(API_BASE));

export const managementHandler: Handler = authenticated(MetricRouter.getAdminRouter(API_BASE));
