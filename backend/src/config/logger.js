import { env } from './env.js';

const write = (level, message, meta = {}) => {
  const payload = {
    level,
    message,
    ...(Object.keys(meta).length ? { meta } : {}),
    timestamp: new Date().toISOString(),
  };
  if (env.NODE_ENV === 'production') {
    console.log(JSON.stringify(payload));
    return;
  }
  console.log(`[${level}] ${message}`, meta);
};

export const logger = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
};
