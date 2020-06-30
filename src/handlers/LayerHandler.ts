import { Handler } from 'aws-lambda';

import { API_BASE } from '../config';
import { getLogger } from '../logging';
import LayerRouter from '../routers/LayerRouter';

import { authenticated } from '.';

const logger = getLogger();

export const openHandler: Handler = authenticated(LayerRouter.getRouter(API_BASE));

export const managementHandler: Handler = authenticated(LayerRouter.getAdminRouter(API_BASE));
