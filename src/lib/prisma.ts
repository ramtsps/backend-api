import { PrismaClient } from '@prisma/client';
import config from '@config/index';
import logger from './logger';

// Extend Prisma Client with custom methods if needed
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: config.env === 'development' 
      ? ['query', 'error', 'warn']
      : ['error'],
    errorFormat: 'pretty',
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (config.env !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  logger.info('Prisma client disconnected');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  logger.info('Prisma client disconnected');
  process.exit(0);
});

// Database health check
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error);
    return false;
  }
};

export default prisma;
