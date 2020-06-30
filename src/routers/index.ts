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
