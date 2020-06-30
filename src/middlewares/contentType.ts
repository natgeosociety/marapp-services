import { NextFunction, Request, Response } from 'express';

import { DEFAULT_CONTENT_TYPE } from '../config';

export const setContentType = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
  next();
};
