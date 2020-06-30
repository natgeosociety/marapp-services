import { Handler } from 'aws-lambda';

import { API_BASE } from '../config';
import { getLogger } from '../logging';
import SubscriberRouter from '../routers/SubscriberRouter';

import { open } from '.';

const logger = getLogger();

export const openHandler: Handler = open(SubscriberRouter.getRouter(API_BASE));
