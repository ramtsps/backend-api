import app from './app';
import config from '@config/index';
import logger from '@/lib/logger';
import { checkDatabaseConnection } from '@/lib/prisma';
import redis from '@/lib/redis';

/**
 * Start the server
 */
const startServer = async (): Promise<void> => {
  try {
    // Check database connection
    logger.info('Checking database connection...');
    const dbConnected = await checkDatabaseConnection();
    
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }
    
    logger.info('Database connection established');

    // Check Redis connection (if enabled)
    if (config.features.enableCaching && redis) {
      try {
        await redis.ping();
        logger.info('Redis connection established');
      } catch (error) {
        logger.warn('Redis connection failed, caching disabled');
      }
    }

    // Start Express server
    const server = app.listen(config.port, () => {
      logger.info(`
        ╔════════════════════════════════════════════════════════╗
        ║                                                        ║
        ║   🚀 ${config.appName}                                 ║
        ║                                                        ║
        ║   Environment: ${config.env.toUpperCase().padEnd(36)} ║
        ║   Port:        ${config.port.toString().padEnd(36)} ║
        ║   API Version: ${config.apiVersion.padEnd(36)} ║
        ║   URL:         http://localhost:${config.port}/api/${config.apiVersion.padEnd(22)} ║
        ║                                                        ║
        ${config.features.enableSwagger ? `║   📚 API Docs: http://localhost:${config.port}/api-docs${' '.padEnd(18)} ║` : ''}
        ║                                                        ║
        ╚════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received, starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        // Close database connection
        const { default: prisma } = await import('@/lib/prisma');
        await prisma.$disconnect();
        logger.info('Database connection closed');

        // Close Redis connection
        if (redis) {
          await redis.quit();
          logger.info('Redis connection closed');
        }

        logger.info('Graceful shutdown completed');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    // Ensure the error is visible on the console (helps when logger isn't initialized)
    // and then log via the logger before exiting.
    // eslint-disable-next-line no-console
    console.error('Failed to start server:', error);
    try {
      logger.error('Failed to start server:', error);
    } catch (err) {
      // ignore logger errors
    }
    process.exit(1);
  }
};

// Start the server
startServer();
