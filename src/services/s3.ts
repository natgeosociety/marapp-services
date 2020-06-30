import AWS from 'aws-sdk';
import { PutObjectRequest } from 'aws-sdk/clients/s3';
import makeError from 'make-error';
import { Readable } from 'stream';
import urljoin from 'url-join';

import { S3_ASSETS_BUCKET, S3_ENDPOINT_URL, S3_MAP_TILES_TTL } from '../config';
import { getLogger } from '../logging';

const logger = getLogger();

export const UploadError = makeError('UploadError');

const s3 = new AWS.S3({ s3ForcePathStyle: true, endpoint: S3_ENDPOINT_URL });

interface StorageEvent {
  bucket: string;
  key: string;
  storageUrl: string;
}

/**
 * Uploads an arbitrarily sized buffer, blob, or stream, using intelligent
 * concurrent handling of parts if the payload is large enough.
 */
export const s3StreamUpload = async (
  readable: Readable,
  keyPath: string,
  contentType: string
): Promise<StorageEvent> => {
  try {
    const config: PutObjectRequest = {
      Bucket: S3_ASSETS_BUCKET,
      Key: keyPath,
      Body: readable,
      ContentType: contentType,
      ACL: 'public-read',
      CacheControl: `max-age=${S3_MAP_TILES_TTL}`,
    };
    const meta = await s3.upload(config).promise();

    logger.debug(`successfully uploaded: ${meta.Location}`);

    return {
      key: meta.Key,
      bucket: meta.Bucket,
      storageUrl: getStorageUrl(meta.Bucket, meta.Key),
    };
  } catch (err) {
    logger.error(err);
    throw new UploadError(`Failed to upload file to S3. ${err.message}`);
  }
};

/**
 * Return the metadata of an object if it exist.
 */
export const s3KeyExists = async (keyPath: string): Promise<StorageEvent> => {
  try {
    const config = {
      Bucket: S3_ASSETS_BUCKET,
      Key: keyPath,
    };
    const meta = await s3.headObject(config).promise();

    logger.debug(`found S3 key ${meta.ContentLength} bytes: ${keyPath}`);

    return {
      key: config.Key,
      bucket: config.Bucket,
      storageUrl: getStorageUrl(config.Bucket, config.Key),
    };
  } catch (err) {
    if (err.code !== 'NotFound') {
      logger.error(err);
      throw new UploadError(`Failed to request file meta from S3. ${err.message}`);
    }
  }
};

/**
 * Helper function.
 * @param bucket
 * @param key
 */
const getStorageUrl = (bucket: string, key: string): string => {
  return urljoin(S3_ENDPOINT_URL, bucket, key);
};
