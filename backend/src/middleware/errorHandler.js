import { ApiError } from '../utils/apiError.js';
import { env } from '../config/env.js';

export const notFoundHandler = (_req, res) => {
  res.status(404).json({ message: 'Route not found' });
};

export const errorHandler = (error, _req, res, _next) => {
  const statusCode = error instanceof ApiError ? error.statusCode : 500;
  const payload = {
    message: error.message || 'Internal server error',
    ...(error.details ? { details: error.details } : {}),
  };

  if (env.NODE_ENV !== 'production') {
    payload.stack = error.stack;
  }

  res.status(statusCode).json(payload);
};
