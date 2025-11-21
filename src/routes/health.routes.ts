import { Router } from 'express';
import { Request, Response } from 'express';
import { successResponse } from '@utils/response';
import { checkDatabaseConnection } from '@/lib/prisma';
import redis from '@/lib/redis';
import config from '@config/index';

const router = Router();

/**
 * @route   GET /api/v1/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/', async (req: Request, res: Response) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
    version: config.apiVersion,
    services: {
      database: false,
      redis: false,
    },
  };

  // Check database
  health.services.database = await checkDatabaseConnection();

  // Check Redis
  if (redis) {
    try {
      await redis.ping();
      health.services.redis = true;
    } catch (error) {
      health.services.redis = false;
    }
  }

  const statusCode = health.services.database ? 200 : 503;
  
  return successResponse(res, health, undefined, statusCode);
});

/**
 * @route   GET /api/v1/health/readiness
 * @desc    Readiness check for Kubernetes
 * @access  Public
 */
router.get('/readiness', async (req: Request, res: Response) => {
  const dbReady = await checkDatabaseConnection();
  
  if (dbReady) {
    return successResponse(res, { ready: true });
  } else {
    return res.status(503).json({ ready: false });
  }
});

/**
 * @route   GET /api/v1/health/liveness
 * @desc    Liveness check for Kubernetes
 * @access  Public
 */
router.get('/liveness', (req: Request, res: Response) => {
  return successResponse(res, { alive: true });
});

export default router;
