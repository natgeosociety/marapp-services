import { Handler } from 'aws-lambda';

import { API_BASE } from '../config';
import { getLogger } from '../logging';
import WidgetRouter from '../routers/WidgetRouter';

import { authenticated } from '.';

const logger = getLogger();

export const openHandler: Handler = authenticated(WidgetRouter.getRouter(API_BASE));

export const managementHandler: Handler = authenticated(WidgetRouter.getAdminRouter(API_BASE));
