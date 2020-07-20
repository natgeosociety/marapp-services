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

import path from 'path';
import { createLogger, format, Logger, LoggerOptions, transports } from 'winston';

import { LOG_LEVEL } from './config';

const mkOptions = (label: string): LoggerOptions => {
  return {
    level: LOG_LEVEL,
    format: format.combine(
      format.errors({ stack: true }),
      format.label({ label }),
      format.colorize({ all: true }),
      format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
      }),
      format.printf((info) => `${info.timestamp} ${info.level} [${info.label}]: ${info.message}`)
    ),
    transports: [new transports.Console()],
  };
};

/**
 * Create a logger using custom options.
 * @param label: A label to be added before the message.
 * @param config: Logger options.
 */
const getLogger = (label: string = path.basename(__filename), config: LoggerOptions = {}): Logger => {
  // @ts-ignore
  return createLogger({ ...mkOptions(label), ...config });
};

export { getLogger };
