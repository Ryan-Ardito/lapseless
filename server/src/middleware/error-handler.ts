import type { ErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export const errorHandler: ErrorHandler = (err, c) => {
  const requestId = c.get('requestId') as string | undefined;

  if (err instanceof ZodError) {
    return c.json(
      { error: 'Validation error', fields: err.flatten().fieldErrors, requestId },
      400,
    );
  }

  if (err instanceof AppError) {
    return c.json(
      { error: err.message, requestId },
      err.statusCode as ContentfulStatusCode,
    );
  }

  logger.error('Unhandled error', { requestId, error: err.message, stack: err.stack });
  return c.json(
    { error: 'Internal server error', requestId },
    500,
  );
};
