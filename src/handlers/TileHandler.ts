import { Handler } from 'aws-lambda';

import { API_BASE } from '../config';
import { getLogger } from '../logging';
import TileRouter from '../routers/TileRouter';

import { open } from '.';

const logger = getLogger();

export const openHandler: Handler = open(TileRouter.getRouter(API_BASE));
