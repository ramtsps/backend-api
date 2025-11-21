import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import config from '@config/index';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  if (stack) {
    msg += `\n${stack}`;
  }
  
  return msg;
});

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: combine(
        colorize(),
        logFormat
      ),
    }),
    
    // File transport for all logs
    new DailyRotateFile({
      filename: path.join(config.logging.dir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
    }),
    
    // File transport for errors only
    new DailyRotateFile({
      level: 'error',
      filename: path.join(config.logging.dir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormat,
    }),
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(config.logging.dir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(config.logging.dir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
    }),
  ],
});

// Create logs directory if it doesn't exist
import fs from 'fs';
if (!fs.existsSync(config.logging.dir)) {
  fs.mkdirSync(config.logging.dir, { recursive: true });
}

export default logger;
