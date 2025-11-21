import express, { Application } from 'express';
import 'express-async-errors';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import config from '@config/index';
import logger from '@/lib/logger';
import { errorHandler, notFoundHandler } from '@middleware/error.middleware';
import { apiLimiter } from '@middleware/rate-limit.middleware';

// Import routes
import authRoutes from '@routes/auth.routes';
import userRoutes from '@routes/user.routes';
import companyRoutes from '@routes/company.routes';
import employeeRoutes from '@routes/employee.routes';
import attendanceRoutes from '@routes/attendance.routes';
import timesheetRoutes from '@routes/timesheet.routes';
import leaveRoutes from '@routes/leave.routes';
import payrollRoutes from '@routes/payroll.routes';
import expenseRoutes from '@routes/expense.routes';
import paymentRoutes from '@routes/payment.routes';
import reconciliationRoutes from '@routes/reconciliation.routes';
import projectRoutes from '@routes/project.routes';
import taskRoutes from '@routes/task.routes';
import appraisalRoutes from '@routes/appraisal.routes';
import skillRoutes from '@routes/skill.routes';
import documentRoutes from '@routes/document.routes';
import invoiceRoutes from '@routes/invoice.routes';
import accountingRoutes from '@routes/accounting.routes';
import leadRoutes from '@routes/lead.routes';
import notificationRoutes from '@routes/notification.routes';
import reportRoutes from '@routes/report.routes';
import webhookRoutes from '@routes/webhook.routes';
import permissionRoutes from '@routes/permission.routes';
import roleRoutes from '@routes/role.routes';
import healthRoutes from '@routes/health.routes';

const app: Application = express();

// Trust proxy (if behind nginx/load balancer)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));

// CORS
app.use(cors({
  origin: config.security.corsOrigin,
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Compression
app.use(compression());

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));
}

// Rate limiting
app.use('/api', apiLimiter);

// API Routes
const API_PREFIX = `/api/${config.apiVersion}`;

app.use(`${API_PREFIX}/health`, healthRoutes);
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/companies`, companyRoutes);
app.use(`${API_PREFIX}/employees`, employeeRoutes);
app.use(`${API_PREFIX}/attendance`, attendanceRoutes);
app.use(`${API_PREFIX}/timesheets`, timesheetRoutes);
app.use(`${API_PREFIX}/leaves`, leaveRoutes);
app.use(`${API_PREFIX}/payroll`, payrollRoutes);
app.use(`${API_PREFIX}/expenses`, expenseRoutes);
app.use(`${API_PREFIX}/payments`, paymentRoutes);
app.use(`${API_PREFIX}/reconciliation`, reconciliationRoutes);
app.use(`${API_PREFIX}/projects`, projectRoutes);
app.use(`${API_PREFIX}/tasks`, taskRoutes);
app.use(`${API_PREFIX}/appraisals`, appraisalRoutes);
app.use(`${API_PREFIX}/skills`, skillRoutes);
app.use(`${API_PREFIX}/documents`, documentRoutes);
app.use(`${API_PREFIX}/invoices`, invoiceRoutes);
app.use(`${API_PREFIX}/accounting`, accountingRoutes);
app.use(`${API_PREFIX}/leads`, leadRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);
app.use(`${API_PREFIX}/webhooks`, webhookRoutes);
app.use(`${API_PREFIX}/permissions`, permissionRoutes);
app.use(`${API_PREFIX}/roles`, roleRoutes);

// Swagger documentation (if enabled)
if (config.features.enableSwagger) {
  import('swagger-ui-express').then((swaggerUi) => {
    import('./config/swagger').then(({ default: swaggerSpec }) => {
      app.use(
        '/api-docs',
        swaggerUi.serve,
        swaggerUi.setup(swaggerSpec, {
          explorer: true,
          customSiteTitle: 'HR System API Documentation',
        })
      );
      logger.info('Swagger documentation available at /api-docs');
    });
  });
}

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;