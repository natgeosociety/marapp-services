import { Handler } from 'aws-lambda';

import { API_BASE } from '../config';
import { getLogger } from '../logging';
import CollectionRouter from '../routers/CollectionRouter';

import { authenticated } from '.';

const logger = getLogger();

export const openHandler: Handler = authenticated(CollectionRouter.getRouter(API_BASE));

export const managementHandler: Handler = authenticated(CollectionRouter.getAdminRouter(API_BASE));
