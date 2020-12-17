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

import { requireEnv } from '../helpers/util';

export const NODE_ENV = requireEnv('NODE_ENV', 'development');
export const LOG_LEVEL = requireEnv('LOG_LEVEL', 'debug');
export const DEBUG = requireEnv('DEBUG', String(false));

export const API_URL = requireEnv('API_URL', 'http://localhost:4000');
export const API_BASE = requireEnv('API_BASE', '/services/api/v1');
export const DEFAULT_CONTENT_TYPE = requireEnv('DEFAULT_CONTENT_TYPE', 'application/vnd.api+json');
export const MAX_RESULT_WINDOW = requireEnv('MAX_RESULT_WINDOW', String(100));
export const MAX_PAYLOAD_SIZE = requireEnv('MAX_PAYLOAD_SIZE', '15mb'); // MongoDB maximum document size is 16 MB;
export const KEEP_METRIC_VERSIONS = requireEnv('KEEP_METRIC_VERSIONS', String(false));
export const API_MAP_TILES_TTL = requireEnv('API_MAP_TILES_TTL', String(31536000)); // (one year);
export const AWS_REGION = requireEnv('AWS_REGION', 'us-east-1');
export const REDIS_CACHE_TTL = requireEnv('REDIS_CACHE_TTL', String(60 * 10)); // (10 minutes);
export const REDIS_LOCK_TTL = requireEnv('REDIS_LOCK_TTL', String(30 * 1000)); // (30 seconds);
export const JWT_GROUP_KEY = requireEnv('JWT_GROUP_KEY', 'https://marapp.org/groups');
export const JWT_PERMISSION_KEY = requireEnv('JWT_PERMISSION_KEY', 'https://marapp.org/permissions');
export const S3_ENDPOINT_URL = requireEnv('S3_ENDPOINT_URL', 'https://s3.us-east-1.amazonaws.com');
export const S3_MAP_TILES_TTL = requireEnv('S3_MAP_TILES_TTL', String(31536000)); // (one year);
export const S3_ASSETS_PATH_PREFIX = requireEnv('S3_ASSETS_PATH_PREFIX', 'assets');
export const S3_ASSETS_BUCKET = requireEnv('S3_ASSETS_BUCKET', 'marapp-assets');
export const ES_INDEX_PREFIX = requireEnv('ES_INDEX_PREFIX', 'marapp');
export const PUBLIC_ORG = requireEnv('PUBLIC_ORG', ''); // anonymous access;

export const MONGODB_URI = requireEnv('MONGODB_URI');
export const REDIS_URI = requireEnv('REDIS_URI');
export const ELASTICSEARCH_URI = requireEnv('ELASTICSEARCH_URI');
export const GOOGLE_SERVICE_ACCOUNT = requireEnv('GOOGLE_SERVICE_ACCOUNT');
export const SNS_TOPIC_SUBSCRIPTION_ARN = requireEnv('SNS_TOPIC_SUBSCRIPTION_ARN');
export const SNS_TOPIC_MANAGER_ARN = requireEnv('SNS_TOPIC_MANAGER_ARN');
export const SNS_TOPIC_WIPE_DATA_ARN = requireEnv('SNS_TOPIC_WIPE_DATA_ARN');
export const SERVICE_API_KEY = requireEnv('SERVICE_API_KEY');
