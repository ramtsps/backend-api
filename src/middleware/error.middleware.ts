import { Request, Response, NextFunction } from 'express';
import { AppError } from '@utils/errors';
import { errorResponse } from '@utils/response';
import logger from '@/lib/logger';
import config from '@config/index';
import { Prisma } from '@prisma/client';

/**
 * Global error handling middleware
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): Response => {
  // Log error
  logger.error('Error occurred:', {
    error: err.message,
    stack: config.env === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    user: req.user?.userId,
  });

  // Handle known AppError
  if (err instanceof AppError) {
    return errorResponse(
      res,
      err.message,
      err.statusCode,
      err.code,
      config.env === 'development' ? { stack: err.stack } : undefined
    );
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(err, res);
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return errorResponse(
      res,
      'Invalid data provided',
      400,
      'VALIDATION_ERROR'
    );
  }

  // Handle JWT errors (if not caught by jwt utility)
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'Invalid token', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 'Token expired', 401, 'TOKEN_EXPIRED');
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return errorResponse(
      res,
      err.message,
      400,
      'VALIDATION_ERROR',
      config.env === 'development' ? (err as any).errors : undefined
    );
  }

  // Handle multer errors
  if (err.name === 'MulterError') {
    return errorResponse(
      res,
      `File upload error: ${err.message}`,
      400,
      'FILE_UPLOAD_ERROR'
    );
  }

  // Default internal server error
  return errorResponse(
    res,
    config.env === 'development' ? err.message : 'Internal server error',
    500,
    'INTERNAL_SERVER_ERROR',
    config.env === 'development' ? { stack: err.stack } : undefined
  );
};

/**
 * Handle Prisma errors
 */
const handlePrismaError = (
  err: Prisma.PrismaClientKnownRequestError,
  res: Response
): Response => {
  switch (err.code) {
    case 'P2002':
      // Unique constraint violation
      const field = (err.meta?.target as string[])?.join(', ') || 'field';
      return errorResponse(
        res,
        `A record with this ${field} already exists`,
        409,
        'UNIQUE_CONSTRAINT_VIOLATION',
        { field }
      );

    case 'P2003':
      // Foreign key constraint violation
      return errorResponse(
        res,
        'Related record not found',
        400,
        'FOREIGN_KEY_CONSTRAINT'
      );

    case 'P2025':
      // Record not found
      return errorResponse(
        res,
        'Record not found',
        404,
        'RECORD_NOT_FOUND'
      );

    case 'P2014':
      // Invalid relation
      return errorResponse(
        res,
        'Invalid relation in the query',
        400,
        'INVALID_RELATION'
      );

    case 'P2021':
      // Table not found
      return errorResponse(
        res,
        'Database table not found',
        500,
        'TABLE_NOT_FOUND'
      );

    case 'P2022':
      // Column not found
      return errorResponse(
        res,
        'Database column not found',
        500,
        'COLUMN_NOT_FOUND'
      );

    default:
      return errorResponse(
        res,
        'Database operation failed',
        500,
        'DATABASE_ERROR',
        config.env === 'development' ? { code: err.code, meta: err.meta } : undefined
      );
  }
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): Response => {
  return errorResponse(
    res,
    `Route ${req.method} ${req.path} not found`,
    404,
    'ROUTE_NOT_FOUND'
  );
};

/**
 * Async error wrapper
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
