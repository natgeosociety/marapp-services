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
export const initEarthEngine = async (): Promise<void> => {
  const credentials = JSON.parse(GOOGLE_SERVICE_ACCOUNT);

  return new Promise(async (resolve, reject) => {
    logger.info('Initializing EE client library.');

    const onInitSuccess = () => {
      logger.warn('Successfully initialized the EE client library.');
      resolve();
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
