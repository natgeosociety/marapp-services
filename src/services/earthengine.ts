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

import ee from '@google/earthengine';
import makeError from 'make-error';

import { GOOGLE_SERVICE_ACCOUNT } from '../config';
import { getLogger } from '../logging';

export const EarthEngineError = makeError('EarthEngineError');

const logger = getLogger();

/**
 * Initialize the EE library.
 * Authenticate using a service account.
 */
export const initEarthEngine = async (): Promise<boolean> => {
  const credentials = JSON.parse(GOOGLE_SERVICE_ACCOUNT);

  return new Promise(async (resolve, reject) => {
    logger.info('Initializing EE client library.');

    const onInitSuccess = () => {
      logger.warn('Successfully initialized the EE client library.');
      resolve(true);
    };
    const onInitError = (err) => {
      logger.error(err);
      throw new EarthEngineError(`EE client library failed to initialize. ${err}`);
    };

    const onSuccess = () => {
      logger.info('EE authentication succeeded.');
      ee.initialize(null, null, onInitSuccess, onInitError);
    };
    const onError = (err) => {
      logger.error(err);
      throw new EarthEngineError(`EE authentication failed. ${err}`);
    };
    ee.data.authenticateViaPrivateKey(credentials, onSuccess, onError);
  });
};
