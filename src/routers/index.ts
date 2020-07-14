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

/**
 * Comma separated query param values to array.
 * @param queryParam
 * @param sep
 */
export const queryParamGroup = (queryParam: string, sep: string = ','): any[] => {
  if (queryParam) {
    return queryParam.split(sep).filter((e: string) => !!e);
  }
  return [];
};

/**
 * Filter path names by the specified prefix key.
 * @param prefixKey
 * @param key
 * @param ignorePrefixChars
 */
export const filterByPrefix = (prefixKey: string, key: string, ignorePrefixChars: string[] = ['-|+']) => {
  const regexp = `^([${ignorePrefixChars}]*)(${prefixKey})\.(.*)`;
  const matcher = key.match(regexp);
  return !!(matcher && matcher.length > 3);
};

/**
 * Remove prefix key from the specified path name.
 * @param prefixKey
 * @param key
 * @param ignorePrefixChars
 */
export const removePrefixKey = (prefixKey: string, key: string, ignorePrefixChars: string[] = ['-|+']) => {
  const regexp = `^([${ignorePrefixChars}]*)(${prefixKey})\.(.*)`;
  const matcher = key.match(regexp);
  if (matcher && matcher.length > 3) {
    return [matcher[1], matcher[3]].join('');
  }
  return key;
};
