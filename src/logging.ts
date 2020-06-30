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
