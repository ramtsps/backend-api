import { z } from 'zod';

// Get webhooks
export const getWebhooksSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    companyId: z.string().uuid().optional(),
    event: z.string().optional(),
    isActive: z.string().optional(),
  }),
});

// Get webhook by ID
export const getWebhookByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid webhook ID'),
  }),
});

// Create webhook
export const createWebhookSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Webhook name is required'),
    url: z.string().url('Invalid webhook URL'),
    companyId: z.string().uuid('Invalid company ID'),
    events: z.array(z.enum([
      'employee.created',
      'employee.updated',
      'employee.deleted',
      'attendance.checked_in',
      'attendance.checked_out',
      'leave.requested',
      'leave.approved',
      'leave.rejected',
      'payroll.generated',
      'payroll.approved',
      'payroll.paid',
      'expense.submitted',
      'expense.approved',
      'expense.reimbursed',
      'project.created',
      'project.updated',
      'task.created',
      'task.updated',
      'task.completed',
      'document.uploaded',
      'performance.review_completed',
      'user.created',
      'user.updated',
    ])),
    secret: z.string().optional(),
    headers: z.record(z.string()).optional(),
    retryOnFailure: z.boolean().optional(),
    maxRetries: z.number().int().min(0).max(10).optional(),
  }),
});

// Update webhook
export const updateWebhookSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid webhook ID'),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    url: z.string().url().optional(),
    events: z.array(z.string()).optional(),
    secret: z.string().optional(),
    headers: z.record(z.string()).optional(),
    isActive: z.boolean().optional(),
    retryOnFailure: z.boolean().optional(),
    maxRetries: z.number().int().min(0).max(10).optional(),
  }),
});

// Delete webhook
export const deleteWebhookSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid webhook ID'),
  }),
});

// Test webhook
export const testWebhookSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid webhook ID'),
  }),
  body: z.object({
    testPayload: z.record(z.any()).optional(),
  }),
});

// Get webhook logs
export const getWebhookLogsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid webhook ID'),
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.enum(['success', 'failed', 'pending']).optional(),
  }),
});

// Retry webhook
export const retryWebhookSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid webhook ID'),
    logId: z.string().uuid('Invalid log ID'),
  }),
});
