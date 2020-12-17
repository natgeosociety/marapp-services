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

import makeError from 'make-error';

import { ErrorObject } from './types/response';

export class ExposedError extends Error {
  code: number;

  constructor(message: string, code: number) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const DocumentError = makeError('DocumentError', ExposedError);
export const DocumentVersionError = makeError('DocumentVersionError', ExposedError);
export const RecordNotFound = makeError('RecordNotFound', ExposedError);
export const AlreadyExistsError = makeError('AlreadyExistsError', ExposedError);
export const ParameterRequiredError = makeError('ParameterRequiredError', ExposedError);
export const UnsupportedOperationType = makeError('UnsupportedOperationType', ExposedError);
export const TaskError = makeError('TaskError', ExposedError);
export const UnauthorizedError = makeError('UnauthorizedError', ExposedError);
export const InvalidParameterError = makeError('InvalidParameterError', ExposedError);
export const UserNotFoundError = makeError('UserNotFoundError', ExposedError);
export const TileGenerationError = makeError('TileGenerationError', ExposedError);
export const PasswordStrengthError = makeError('PasswordStrengthError', ExposedError);

export class ValidationError extends ExposedError {
  public errors: ErrorObject[];

  constructor(errors: ErrorObject[], code: number) {
    super('', code);
    this.errors = errors;
  }
}
