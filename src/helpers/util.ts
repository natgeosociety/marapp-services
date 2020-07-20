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

import { get } from 'lodash';

import { ParameterRequiredError } from '../errors';

/**
 * Ensure required ENV variables are set during deployment.
 *
 * Default behavior is to throw an exception if environment variable missing
 * and defaultValue value not set.
 *
 * @param env
 * @param defaultValue
 */
export const requireEnv = (env: string, defaultValue: string = null) => {
  if (typeof process.env[env] !== 'undefined') {
    return process.env[env];
  }
  if (defaultValue === null && ['production'].includes(process.env.NODE_ENV)) {
    throw new Error(`Required ENV variable not set: ${env}`);
  } else if (defaultValue === null) {
    console.info(`Required ENV variable not set: ${env}`);
  }
  return defaultValue;
};

/**
 * Validates keys value at path of object.
 *
 * Field requiredKeys can accept nested values for keys,
 * eg: 'firstObject.secondObject.someKey'
 *
 * @param object
 * @param requiredKeys
 * @param suppressErrors
 * @param sentinel
 */
export const validateKeys = <T, K extends keyof T>(
  object: T,
  requiredKeys: K[],
  suppressErrors: boolean = false,
  sentinel = Object()
): boolean => {
  let isValid = true;
  const missingKeys = requiredKeys.filter((key) => get(object, key, sentinel) === sentinel);
  if (missingKeys.length) {
    isValid = false;
    if (!suppressErrors) {
      throw new ParameterRequiredError(`Parameter is required: ${missingKeys.join(', ')}`, 500);
    }
  }
  return isValid;
};

/**
 * Runs the provided async function for each record of the input array.
 * @param records
 * @param callback
 */
export const forEachAsync = async (records: any[], callback: (i: any) => Promise<any>) =>
  Promise.all(records.map((i) => callback(i)));

/**
 * Latinize given string
 * @param term
 */
export const latinizeTerm = (term: string = ''): string =>
  term
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/**
 * Appends hint symbols for searched term
 * @param searchTerm
 * @param searchWholeValue
 */
export const searchTermHint = (searchTerm: string = '', searchWholeValue: string = ''): string => {
  const searchTermIndex = latinizeTerm(searchWholeValue).indexOf(latinizeTerm(searchTerm));

  return [
    searchWholeValue.slice(0, searchTermIndex),
    '{{',
    searchWholeValue.slice(searchTermIndex, searchTermIndex + searchTerm.length),
    '}}',
    searchWholeValue.slice(searchTermIndex + searchTerm.length),
  ].join('');
};
