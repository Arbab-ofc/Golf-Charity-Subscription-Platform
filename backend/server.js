import { createServer } from 'node:http';
import app from './src/app.js';
import { env } from './src/config/env.js';
import { logger } from './src/config/logger.js';

const server = createServer(app);

server.listen(env.PORT, () => {
  logger.info(`API listening on port ${env.PORT}`);
});

const shutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(() => process.exit(0));
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
