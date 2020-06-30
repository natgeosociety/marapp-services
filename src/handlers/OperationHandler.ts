import { Handler } from 'aws-lambda';

import { API_BASE } from '../config';
import { getLogger } from '../logging';
import OperationRouter from '../routers/OperationRouter';

import { system } from '.';

const logger = getLogger();

export const managementHandler: Handler = system(OperationRouter.getRouter(API_BASE));
