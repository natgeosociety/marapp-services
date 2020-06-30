import axios from 'axios';
import makeError from 'make-error';
import { Readable } from 'stream';

import { getLogger } from '../logging';

const logger = getLogger();

export const RequestError = makeError('RequestError');

interface StreamResponse {
  stream: Readable;
  contentType: string;
}

/**
 * Provide the response.data as a readable stream together
 * with the Content-Type headers.
 */
export const fetchURLToStream = async (url: string): Promise<StreamResponse> => {
  try {
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream',
    });

    const contentType = response.headers['content-type'];
    if (!contentType) {
      throw new RequestError(`Missing Content-Type Header on resource: ${url}`);
    }
    logger.debug(`streaming request ${response.statusText}`);

    return { stream: response.data, contentType };
  } catch (err) {
    logger.error(err);
    if (err.response) {
      // server responded with non 2xx status code;
      throw new RequestError(`Request failed with status code ${err.response.status}: ${url}`);
    } else {
      throw new RequestError(`Error occurred while fetching: ${url} ${err.message}`);
    }
  }
};
