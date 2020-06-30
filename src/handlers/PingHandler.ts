import { Handler } from 'aws-lambda';
import { Request, Response } from 'express';

import { getLogger } from '../logging';

import { authenticated, open } from '.';

const logger = getLogger();

/**
 * Mock handlers.
 */
export const openHandler: Handler = open(async (req: Request, res: Response) => {
  logger.debug('Handling ping event!');

  res.json({ message: 'Pong!' });
});

/**
 * Mock handlers.
 */
export const secureHandler: Handler = authenticated(async (req: Request, res: Response) => {
  logger.debug('Handling ping event!');

  res.json({ message: 'Secure Pong!' });
});
