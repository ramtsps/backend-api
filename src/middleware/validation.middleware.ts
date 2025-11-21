import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '@utils/errors';

/**
 * Validate request using Zod schema
 */
export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        next(new ValidationError('Validation failed', errors));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Validate UUID parameter
 */
export const validateUUID = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(value)) {
      next(new ValidationError(`Invalid UUID format for ${paramName}`));
    } else {
      next();
    }
  };
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  if (page < 1) {
    next(new ValidationError('Page must be greater than 0'));
    return;
  }

  if (limit < 1 || limit > 100) {
    next(new ValidationError('Limit must be between 1 and 100'));
    return;
  }

  // Attach to request for easy access
  req.query.page = page.toString();
  req.query.limit = limit.toString();

  next();
};
