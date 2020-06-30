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
export const RecordNotFound = makeError('RecordNotFound', ExposedError);
export const ParameterRequiredError = makeError('ParameterRequiredError', ExposedError);
export const UnsupportedOperationType = makeError('UnsupportedOperationType', ExposedError);
export const TaskError = makeError('TaskError', ExposedError);
export const UnauthorizedError = makeError('UnauthorizedError', ExposedError);
export const InvalidParameterError = makeError('InvalidParameterError', ExposedError);
export const UserNotFoundError = makeError('UserNotFoundError', ExposedError);
export const NotImplementedError = makeError('NotImplementedError', ExposedError);
export const TileGenerationError = makeError('TileGenerationError', ExposedError);

export class ValidationError extends ExposedError {
  public errors: ErrorObject[];

  constructor(errors: ErrorObject[], code: number) {
    super('', code);
    this.errors = errors;
  }
}
