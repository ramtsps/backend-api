import swaggerJsdoc from 'swagger-jsdoc';
import config from './index';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'HR & Project Management SaaS Platform API',
    version: '1.0.0',
    description: `
# Enterprise HR & Project Management Platform

A comprehensive, production-ready HR and Project Management SaaS platform with:

- **273+ API Endpoints** across 19 integrated modules
- **Multi-tenant Architecture** with complete data isolation
- **Granular RBAC** with 85+ permissions and 6 default roles
- **Dynamic Feature Configuration** per company
- **RESTful API** design with comprehensive validation
- **JWT Authentication** with refresh tokens
- **Redis Caching** for performance optimization

## Key Features

### Core Modules
- User & Company Management
- Employee Management
- Department & Designation Management

### Time & Attendance
- Attendance Tracking (GPS, Biometric)
- Timesheet Management
- Leave Management

### Payroll & Finance
- Payroll Processing
- Expense Management
- Invoice & Accounting

### Project Management
- Project & Task Management
- Kanban Boards
- Performance Management
- Skills & Competencies

### Supporting Features
- Document Management
- Multi-channel Notifications
- Webhooks & Integrations
- CRM / Lead Management

### RBAC
- 85+ Permissions
- 6 Default Roles
- Custom Role Creation
- Permission-based Access Control

## Authentication

All endpoints (except auth endpoints) require JWT authentication:

\`\`\`
Authorization: Bearer {access_token}
\`\`\`

Get your access token by calling the login endpoint.

## Multi-Tenancy

The system supports multiple companies with complete data isolation:
- Super Admin can access all companies
- Company Admin can only access their company data
- All endpoints are tenant-aware

## Rate Limiting

API requests are rate-limited to 100 requests per 15 minutes per IP address.

## Pagination

List endpoints support pagination with query parameters:
- \`page\` - Page number (default: 1)
- \`limit\` - Items per page (default: 20)

## Error Handling

All errors follow this format:

\`\`\`json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "fieldName",
      "message": "Field-specific error"
    }
  ]
}
\`\`\`
    `,
    contact: {
      name: 'API Support',
      email: 'api@yourdomain.com',
    },
    license: {
      name: 'Proprietary',
      url: 'https://yourdomain.com/license',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}/api/${config.apiVersion}`,
      description: 'Development Server',
    },
    {
      url: `https://api.yourdomain.com/api/${config.apiVersion}`,
      description: 'Production Server',
    },
  ],
  tags: [
    { name: 'Authentication', description: 'User authentication and authorization' },
    { name: 'Users', description: 'User management' },
    { name: 'Companies', description: 'Company management and configuration' },
    { name: 'Employees', description: 'Employee management' },
    { name: 'Attendance', description: 'Attendance tracking and management' },
    { name: 'Timesheets', description: 'Timesheet management' },
    { name: 'Leave', description: 'Leave management and approvals' },
    { name: 'Payroll', description: 'Payroll processing and management' },
    { name: 'Expenses', description: 'Expense claims and reimbursements' },
    { name: 'Projects', description: 'Project management' },
    { name: 'Tasks', description: 'Task management and Kanban boards' },
    { name: 'Appraisals', description: 'Performance management and appraisals' },
    { name: 'Skills', description: 'Skills and competencies management' },
    { name: 'Documents', description: 'Document management and repository' },
    { name: 'Invoices', description: 'Invoice management' },
    { name: 'Accounting', description: 'Bookkeeping and accounting' },
    { name: 'CRM', description: 'Lead and client management' },
    { name: 'Notifications', description: 'Multi-channel notifications' },
    { name: 'Webhooks', description: 'Webhook integrations' },
    { name: 'Reports', description: 'Reporting and analytics' },
    { name: 'Permissions', description: 'Permission management (RBAC)' },
    { name: 'Roles', description: 'Role management (RBAC)' },
    { name: 'Health', description: 'Health check and monitoring' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token',
      },
    },
    schemas: {
      // Common Schemas
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Error message' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      Success: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation successful' },
          data: { type: 'object' },
        },
      },
      PaginatedResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: { type: 'array', items: {} },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 20 },
              total: { type: 'integer', example: 100 },
              totalPages: { type: 'integer', example: 5 },
            },
          },
        },
      },

      // Auth Schemas
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@company.com' },
          password: { type: 'string', format: 'password', minLength: 8, example: 'SecurePass123!' },
          firstName: { type: 'string', example: 'John' },
          lastName: { type: 'string', example: 'Doe' },
          companyName: { type: 'string', example: 'Acme Corp' },
          role: { type: 'string', enum: ['admin', 'hr', 'manager', 'employee'], default: 'admin' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@company.com' },
          password: { type: 'string', format: 'password', example: 'SecurePass123!' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Login successful' },
          data: {
            type: 'object',
            properties: {
              accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
              refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  email: { type: 'string', format: 'email' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  role: { type: 'string' },
                  companyId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
      },

      // User Schemas
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          role: { type: 'string', enum: ['super_admin', 'admin', 'hr', 'manager', 'employee'] },
          companyId: { type: 'string', format: 'uuid', nullable: true },
          employeeId: { type: 'string', format: 'uuid', nullable: true },
          isActive: { type: 'boolean' },
          isSuperAdmin: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      // Company Schemas
      Company: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Acme Corp' },
          industry: { type: 'string', example: 'IT', nullable: true },
          size: { type: 'string', example: '50-100' },
          country: { type: 'string', example: 'United States' },
          city: { type: 'string', example: 'New York' },
          address: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string', format: 'email' },
          website: { type: 'string' },
          taxId: { type: 'string' },
          subscriptionTier: { type: 'string', enum: ['free', 'basic', 'professional', 'enterprise'] },
          subscriptionStatus: { type: 'string', enum: ['active', 'inactive', 'trial', 'suspended'] },
          isActive: { type: 'boolean' },
          features: {
            type: 'object',
            properties: {
              attendance: { type: 'boolean' },
              leave: { type: 'boolean' },
              payroll: { type: 'boolean' },
              projects: { type: 'boolean' },
              tasks: { type: 'boolean' },
              timesheets: { type: 'boolean' },
              performance: { type: 'boolean' },
              skills: { type: 'boolean' },
              documents: { type: 'boolean' },
              invoicing: { type: 'boolean' },
              accounting: { type: 'boolean' },
              leads: { type: 'boolean' },
              recruitment: { type: 'boolean' },
              training: { type: 'boolean' },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      // Employee Schemas
      Employee: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          employeeCode: { type: 'string', example: 'EMP001' },
          firstName: { type: 'string', example: 'John' },
          lastName: { type: 'string', example: 'Doe' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          dateOfBirth: { type: 'string', format: 'date' },
          gender: { type: 'string', enum: ['male', 'female', 'other'] },
          maritalStatus: { type: 'string', enum: ['single', 'married', 'divorced', 'widowed'] },
          nationality: { type: 'string' },
          companyId: { type: 'string', format: 'uuid' },
          departmentId: { type: 'string', format: 'uuid' },
          designationId: { type: 'string', format: 'uuid' },
          managerId: { type: 'string', format: 'uuid', nullable: true },
          joiningDate: { type: 'string', format: 'date' },
          employmentType: { type: 'string', enum: ['full_time', 'part_time', 'contract', 'intern'] },
          workLocation: { type: 'string', enum: ['office', 'remote', 'hybrid'] },
          status: { type: 'string', enum: ['active', 'inactive', 'terminated', 'on_leave'] },
          salary: { type: 'number', example: 50000 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      // Permission Schemas
      Permission: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          module: { type: 'string', example: 'payroll' },
          action: { type: 'string', example: 'approve' },
          code: { type: 'string', example: 'payroll.approve' },
          description: { type: 'string', example: 'Approve payroll' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      CreatePermissionRequest: {
        type: 'object',
        required: ['module', 'action', 'code'],
        properties: {
          module: { type: 'string', example: 'payroll', minLength: 1, maxLength: 100 },
          action: { type: 'string', example: 'approve', minLength: 1, maxLength: 100 },
          code: { type: 'string', example: 'payroll.approve', pattern: '^[a-z_]+\\.[a-z_]+$' },
          description: { type: 'string', example: 'Approve payroll' },
        },
      },

      // Role Schemas
      Role: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          companyId: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'hr_manager' },
          displayName: { type: 'string', example: 'HR Manager' },
          description: { type: 'string', example: 'Manage employees, attendance, leave, and performance' },
          permissions: { type: 'object' },
          isSystem: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateRoleRequest: {
        type: 'object',
        required: ['companyId', 'name', 'displayName'],
        properties: {
          companyId: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'sales_manager', pattern: '^[a-z_]+$' },
          displayName: { type: 'string', example: 'Sales Manager', minLength: 1, maxLength: 255 },
          description: { type: 'string', example: 'Manage sales team and CRM' },
          permissions: { type: 'array', items: { type: 'string' } },
          isSystem: { type: 'boolean', default: false },
        },
      },

      // Attendance Schemas
      Attendance: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          employeeId: { type: 'string', format: 'uuid' },
          companyId: { type: 'string', format: 'uuid' },
          date: { type: 'string', format: 'date' },
          checkIn: { type: 'string', format: 'date-time' },
          checkOut: { type: 'string', format: 'date-time', nullable: true },
          workHours: { type: 'number', example: 8.5 },
          overtimeHours: { type: 'number', example: 1.5 },
          status: { type: 'string', enum: ['present', 'absent', 'late', 'half_day', 'on_leave'] },
          isRemote: { type: 'boolean' },
          notes: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // Leave Schemas
      Leave: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          employeeId: { type: 'string', format: 'uuid' },
          leaveTypeId: { type: 'string', format: 'uuid' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          numberOfDays: { type: 'number', example: 3 },
          reason: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'cancelled'] },
          approvedBy: { type: 'string', format: 'uuid', nullable: true },
          approvedAt: { type: 'string', format: 'date-time', nullable: true },
          rejectionReason: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // Project Schemas
      Project: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          companyId: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Website Redesign' },
          description: { type: 'string' },
          projectCode: { type: 'string', example: 'PROJ-001' },
          status: { type: 'string', enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date', nullable: true },
          budget: { type: 'number', example: 100000 },
          actualCost: { type: 'number', example: 75000 },
          progress: { type: 'integer', minimum: 0, maximum: 100 },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // Task Schemas
      Task: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          projectId: { type: 'string', format: 'uuid' },
          title: { type: 'string', example: 'Design homepage mockup' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done', 'blocked'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          assigneeId: { type: 'string', format: 'uuid', nullable: true },
          dueDate: { type: 'string', format: 'date', nullable: true },
          estimatedHours: { type: 'number', example: 8 },
          actualHours: { type: 'number', example: 6.5 },
          order: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              success: false,
              message: 'Authentication required',
            },
          },
        },
      },
      ForbiddenError: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              success: false,
              message: 'Insufficient permissions',
            },
          },
        },
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              success: false,
              message: 'Resource not found',
            },
          },
        },
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              success: false,
              message: 'Validation failed',
              errors: [
                { field: 'email', message: 'Invalid email format' },
                { field: 'password', message: 'Password must be at least 8 characters' },
              ],
            },
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/docs/*.ts',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;