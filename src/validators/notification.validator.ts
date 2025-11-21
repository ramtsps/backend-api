import { z } from 'zod';

// Get notifications
export const getNotificationsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    userId: z.string().uuid().optional(),
    type: z.enum(['info', 'success', 'warning', 'error', 'reminder']).optional(),
    category: z.enum([
      'attendance',
      'leave',
      'payroll',
      'expense',
      'project',
      'task',
      'document',
      'performance',
      'system',
      'other'
    ]).optional(),
    isRead: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

// Get notification by ID
export const getNotificationByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid notification ID'),
  }),
});

// Create notification
export const createNotificationSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Notification title is required'),
    message: z.string().min(1, 'Notification message is required'),
    type: z.enum(['info', 'success', 'warning', 'error', 'reminder']).optional(),
    category: z.enum([
      'attendance',
      'leave',
      'payroll',
      'expense',
      'project',
      'task',
      'document',
      'performance',
      'system',
      'other'
    ]),
    recipientIds: z.array(z.string().uuid()),
    actionUrl: z.string().optional(),
    actionText: z.string().optional(),
    metadata: z.record(z.any()).optional(),
    sendEmail: z.boolean().optional(),
    sendSms: z.boolean().optional(),
    sendPush: z.boolean().optional(),
  }),
});

// Mark as read
export const markAsReadSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid notification ID'),
  }),
});

// Mark all as read
export const markAllAsReadSchema = z.object({
  query: z.object({
    userId: z.string().uuid('User ID is required'),
  }),
});

// Delete notification
export const deleteNotificationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid notification ID'),
  }),
});

// Notification preferences
export const getNotificationPreferencesSchema = z.object({
  query: z.object({
    userId: z.string().uuid('User ID is required'),
  }),
});

export const updateNotificationPreferencesSchema = z.object({
  body: z.object({
    userId: z.string().uuid('User ID is required'),
    preferences: z.object({
      email: z.object({
        attendance: z.boolean().optional(),
        leave: z.boolean().optional(),
        payroll: z.boolean().optional(),
        expense: z.boolean().optional(),
        project: z.boolean().optional(),
        task: z.boolean().optional(),
        document: z.boolean().optional(),
        performance: z.boolean().optional(),
        system: z.boolean().optional(),
      }).optional(),
      sms: z.object({
        attendance: z.boolean().optional(),
        leave: z.boolean().optional(),
        payroll: z.boolean().optional(),
        expense: z.boolean().optional(),
      }).optional(),
      push: z.object({
        attendance: z.boolean().optional(),
        leave: z.boolean().optional(),
        payroll: z.boolean().optional(),
        expense: z.boolean().optional(),
        project: z.boolean().optional(),
        task: z.boolean().optional(),
        document: z.boolean().optional(),
      }).optional(),
      inApp: z.boolean().optional(),
    }),
  }),
});

// Notification templates
export const getNotificationTemplatesSchema = z.object({
  query: z.object({
    category: z.enum([
      'attendance',
      'leave',
      'payroll',
      'expense',
      'project',
      'task',
      'document',
      'performance',
      'system',
      'other'
    ]).optional(),
  }),
});

export const createNotificationTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Template name is required'),
    category: z.enum([
      'attendance',
      'leave',
      'payroll',
      'expense',
      'project',
      'task',
      'document',
      'performance',
      'system',
      'other'
    ]),
    subject: z.string().min(1, 'Subject is required'),
    emailBody: z.string().optional(),
    smsBody: z.string().optional(),
    pushBody: z.string().optional(),
    variables: z.array(z.string()).optional(),
  }),
});

export const updateNotificationTemplateSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid template ID'),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    subject: z.string().min(1).optional(),
    emailBody: z.string().optional(),
    smsBody: z.string().optional(),
    pushBody: z.string().optional(),
    variables: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const deleteNotificationTemplateSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid template ID'),
  }),
});

// Send bulk notification
export const sendBulkNotificationSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    message: z.string().min(1, 'Message is required'),
    type: z.enum(['info', 'success', 'warning', 'error', 'reminder']).optional(),
    category: z.enum([
      'attendance',
      'leave',
      'payroll',
      'expense',
      'project',
      'task',
      'document',
      'performance',
      'system',
      'other'
    ]),
    recipientType: z.enum(['all', 'department', 'role', 'custom']),
    departmentIds: z.array(z.string().uuid()).optional(),
    roles: z.array(z.string()).optional(),
    recipientIds: z.array(z.string().uuid()).optional(),
    sendEmail: z.boolean().optional(),
    sendSms: z.boolean().optional(),
    sendPush: z.boolean().optional(),
  }),
});
