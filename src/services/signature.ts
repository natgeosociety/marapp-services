import { createHash } from 'crypto';
import stringify from 'fast-json-stable-stringify';

/**
 * Generate hashes from objects.
 * @param obj
 */
export const hash = (obj: any): string => {
  const norm = stringify(obj); // create a deterministic string from object;
  return createHash('sha256').update(norm).digest('hex');
};
