import dotenv from 'dotenv';


// Load environment variables
dotenv.config();

interface Config {
  env: string;
  port: number;
  apiVersion: string;
  appName: string;
  
  database: {
    url: string;
  };
  
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  
  email: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    from: string;
  };
  
  upload: {
    dir: string;
    maxFileSize: number;
    allowedTypes: string[];
  };
  
  aws: {
    accessKeyId?: string;
    secretAccessKey?: string;
    region: string;
    s3Bucket?: string;
  };
  
  security: {
    bcryptRounds: number;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    corsOrigin: string[];
  };
  
  mfa: {
    appName: string;
    issuer: string;
  };
  
  logging: {
    level: string;
    dir: string;
  };
  
  features: {
    enableMfa: boolean;
    enableEmailVerification: boolean;
    enableWebhooks: boolean;
    enableBackgroundJobs: boolean;
    enableCaching: boolean;
    enableSwagger: boolean;
  };
  
  pagination: {
    defaultPageSize: number;
    maxPageSize: number;
  };
  
  session: {
    secret: string;
    timeoutMinutes: number;
  };
  
  defaults: {
    currency: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
  };
  
  payroll: {
    processingDay: number;
    paymentBufferDays: number;
  };
  
  utr: {
    validationEnabled: boolean;
    formatRegex: string;
    autoMatchThreshold: number;
  };
}

const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  apiVersion: process.env.API_VERSION || 'v1',
  appName: process.env.APP_NAME || 'HR System',
  
  database: {
    url: process.env.DATABASE_URL || '',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'noreply@example.com',
  },
  
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || '').split(',').filter(Boolean),
  },
  
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    s3Bucket: process.env.AWS_S3_BUCKET,
  },
  
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
  },
  
  mfa: {
    appName: process.env.MFA_APP_NAME || 'HR System',
    issuer: process.env.MFA_ISSUER || 'Your Company',
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || './logs',
  },
  
  features: {
    enableMfa: process.env.ENABLE_MFA === 'true',
    enableEmailVerification: process.env.ENABLE_EMAIL_VERIFICATION === 'true',
    enableWebhooks: process.env.ENABLE_WEBHOOKS === 'true',
    enableBackgroundJobs: process.env.ENABLE_BACKGROUND_JOBS === 'true',
    enableCaching: process.env.ENABLE_CACHING === 'true',
    enableSwagger: process.env.ENABLE_SWAGGER !== 'false',
  },
  
  pagination: {
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '20', 10),
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '100', 10),
  },
  
  session: {
    secret: process.env.SESSION_SECRET || 'session-secret',
    timeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '30', 10),
  },
  
  defaults: {
    currency: process.env.DEFAULT_CURRENCY || 'USD',
    timezone: process.env.DEFAULT_TIMEZONE || 'UTC',
    dateFormat: process.env.DEFAULT_DATE_FORMAT || 'YYYY-MM-DD',
    timeFormat: process.env.DEFAULT_TIME_FORMAT || '24h',
  },
  
  payroll: {
    processingDay: parseInt(process.env.PAYROLL_PROCESSING_DAY || '25', 10),
    paymentBufferDays: parseInt(process.env.SALARY_PAYMENT_BUFFER_DAYS || '3', 10),
  },
  
  utr: {
    validationEnabled: process.env.UTR_VALIDATION_ENABLED !== 'false',
    formatRegex: process.env.UTR_FORMAT_REGEX || '^[A-Z0-9]{16,22}$',
    autoMatchThreshold: parseFloat(process.env.RECONCILIATION_AUTO_MATCH_THRESHOLD || '0.99'),
  },
};

// Validate required config
if (!config.database.url) {
  throw new Error('DATABASE_URL is required');
}

if (config.env === 'production') {
  if (config.jwt.secret === 'your-secret-key') {
    throw new Error('JWT_SECRET must be set in production');
  }
  if (config.jwt.refreshSecret === 'your-refresh-secret') {
    throw new Error('JWT_REFRESH_SECRET must be set in production');
  }
}

export default config;
