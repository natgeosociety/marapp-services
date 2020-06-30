import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';

import { SuccessResponse } from '../types/response';

export const healthcheck = asyncHandler(async (req: Request, res: Response) => {
  const statusCode = 200;
  const body: SuccessResponse = { code: statusCode, data: { success: true } };

  return res.status(statusCode).json(body);
});
