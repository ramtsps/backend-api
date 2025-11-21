import { Response } from 'express';

/**
 * Standard API Response Interface
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code?: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  timestamp: string;
}

/**
 * Success response helper
 */
export const successResponse = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200,
  meta?: any
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    meta,
    timestamp: new Date().toISOString(),
  };

  return res.status(statusCode).json(response);
};

/**
 * Error response helper
 */
export const errorResponse = (
  res: Response,
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
): Response => {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  };

  return res.status(statusCode).json(response);
};

/**
 * Paginated response helper
 */
export const paginatedResponse = <T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): Response => {
  const totalPages = Math.ceil(total / limit);

  return successResponse(
    res,
    data,
    message,
    200,
    {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    }
  );
};

/**
 * Created response (201)
 */
export const createdResponse = <T>(
  res: Response,
  data: T,
  message: string = 'Resource created successfully'
): Response => {
  return successResponse(res, data, message, 201);
};

/**
 * No content response (204)
 */
export const noContentResponse = (res: Response): Response => {
  return res.status(204).send();
};

/**
 * Accepted response (202)
 */
export const acceptedResponse = <T>(
  res: Response,
  data?: T,
  message: string = 'Request accepted for processing'
): Response => {
  return successResponse(res, data, message, 202);
};
