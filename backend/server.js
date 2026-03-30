import { createServer } from 'node:http';
import app from './src/app.js';
import { env } from './src/config/env.js';
import { logger } from './src/config/logger.js';
import { ensureDefaultAdmin } from './src/bootstrap/ensureDefaultAdmin.js';
import { ensureDefaultUser } from './src/bootstrap/ensureDefaultUser.js';

const server = createServer(app);

const start = async () => {
  await ensureDefaultAdmin();
  await ensureDefaultUser();
  server.listen(env.PORT, () => {
    logger.info(`API listening on port ${env.PORT}`);
  });
};

start().catch((error) => {
  logger.error('Server bootstrap failed', { error: error.message });
  process.exit(1);
});

const shutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(() => process.exit(0));
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
