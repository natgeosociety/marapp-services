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
