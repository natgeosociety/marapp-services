import { Handler } from 'aws-lambda';

import { API_BASE } from '../config';
import { getLogger } from '../logging';
import SwaggerRouter from '../routers/SwaggerRouter';

import { open } from '.';

const logger = getLogger();

export const openHandler: Handler = open(SwaggerRouter.getRouter(API_BASE));
