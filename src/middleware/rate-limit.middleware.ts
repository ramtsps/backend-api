import rateLimit from 'express-rate-limit';
import config from '@config/index';
import { TooManyRequestsError } from '@utils/errors';

/**
 * General API rate limiter
 */
export const apiLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMaxRequests,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new TooManyRequestsError('Too many requests, please try again later'));
  },
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  skipSuccessfulRequests: true,
  message: 'Too many authentication attempts, please try again later',
  handler: (req, res, next) => {
    next(new TooManyRequestsError('Too many authentication attempts'));
  },
});

/**
 * Rate limiter for file uploads
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: 'Too many file uploads, please try again later',
  handler: (req, res, next) => {
    next(new TooManyRequestsError('Too many file uploads'));
  },
});

/**
 * Rate limiter for email sending
 */
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many emails sent, please try again later',
  handler: (req, res, next) => {
    next(new TooManyRequestsError('Too many emails sent'));
  },
});
