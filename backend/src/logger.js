import pino from 'pino';
import { config } from './config.js';

// Structured logging from the start. In dev we pretty-print; in prod this
// emits newline-delimited JSON that ships cleanly to any log aggregator.
const isProd = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: config.logLevel,
  base: { service: 'Capita-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isProd
    ? {}
    : {
        transport: {
          target: 'pino/file',
          options: { destination: 1 },
        },
      }),
});
