/*
  Copyright 2018-2020 National Geographic Society

  Use of this software does not constitute endorsement by National Geographic
  Society (NGS). The NGS name and NGS logo may not be used for any purpose without
  written permission from NGS.

  Licensed under the Apache License, Version 2.0 (the "License"); you may not use
  this file except in compliance with the License. You may obtain a copy of the
  License at

      https://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software distributed
  under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
  CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';

import { SuccessResponse } from '../types/response';

export const healthcheck = asyncHandler(async (req: Request, res: Response) => {
  const statusCode = 200;
  const body: SuccessResponse = { code: statusCode, data: { success: true } };

  return res.status(statusCode).json(body);
});
