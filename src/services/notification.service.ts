import prisma from '@/lib/prisma';
import { cache } from '@/lib/redis';
import { 
  NotFoundError, 
  ConflictError, 
  BadRequestError,
  ForbiddenError 
} from '@utils/errors';

class NotificationService {
  /**
   * Get notifications
   */
  async getNotifications(
    filters: any,
    page: number = 1,
    limit: number = 50
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.isRead !== undefined) {
      where.isRead = filters.isRead === 'true';
    }

    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      prisma.notification.count({ where }),
    ]);

    return { notifications, total, page, limit };
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(notificationId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    return notification;
  }

  /**
   * Create notification (single or bulk)
   */
  async createNotification(data: any) {
    const notifications: any[] = [];

    for (const recipientId of data.recipientIds) {
      const notification = await prisma.notification.create({
        data: {
          userId: recipientId,
          title: data.title,
          message: data.message,
          type: data.type || 'info',
          category: data.category,
          actionUrl: data.actionUrl,
          actionText: data.actionText,
          metadata: data.metadata || {},
        },
      });

      notifications.push(notification);

      // Send via different channels
      if (data.sendEmail) {
        await this.sendEmailNotification(recipientId, data);
      }

      if (data.sendSms) {
        await this.sendSmsNotification(recipientId, data);
      }

      if (data.sendPush) {
        await this.sendPushNotification(recipientId, data);
      }
    }

    return notifications;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { message: 'All notifications marked as read' };
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return { message: 'Notification deleted successfully' };
  }

  // ===== NOTIFICATION PREFERENCES =====

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(userId: string) {
    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    // Create default preferences if not exists
    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: {
          userId,
          emailPreferences: {
            attendance: true,
            leave: true,
            payroll: true,
            expense: true,
            project: true,
            task: true,
            document: true,
            performance: true,
            system: true,
          },
          smsPreferences: {
            attendance: false,
            leave: true,
            payroll: true,
            expense: false,
          },
          pushPreferences: {
            attendance: true,
            leave: true,
            payroll: true,
            expense: true,
            project: true,
            task: true,
            document: true,
          },
          inAppEnabled: true,
        },
      });
    }

    return preferences;
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(userId: string, preferences: any) {
    const updated = await prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        emailPreferences: preferences.email || {},
        smsPreferences: preferences.sms || {},
        pushPreferences: preferences.push || {},
        inAppEnabled: preferences.inApp !== undefined ? preferences.inApp : true,
      },
      update: {
        emailPreferences: preferences.email,
        smsPreferences: preferences.sms,
        pushPreferences: preferences.push,
        inAppEnabled: preferences.inApp,
      },
    });

    return updated;
  }

  // ===== NOTIFICATION TEMPLATES =====

  /**
   * Get notification templates
   */
  async getNotificationTemplates(filters: any) {
    const where: any = {};

    if (filters.category) {
      where.category = filters.category;
    }

    const templates = await prisma.notificationTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return templates;
  }

  /**
   * Create notification template
   */
  async createNotificationTemplate(data: any) {
    const template = await prisma.notificationTemplate.create({
      data: {
        name: data.name,
        category: data.category,
        subject: data.subject,
        emailBody: data.emailBody,
        smsBody: data.smsBody,
        pushBody: data.pushBody,
        variables: data.variables || [],
      },
    });

    return template;
  }

  /**
   * Update notification template
   */
  async updateNotificationTemplate(templateId: string, data: any) {
    const template = await prisma.notificationTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundError('Notification template not found');
    }

    const updated = await prisma.notificationTemplate.update({
      where: { id: templateId },
      data: {
        name: data.name,
        subject: data.subject,
        emailBody: data.emailBody,
        smsBody: data.smsBody,
        pushBody: data.pushBody,
        variables: data.variables,
        isActive: data.isActive,
      },
    });

    return updated;
  }

  /**
   * Delete notification template
   */
  async deleteNotificationTemplate(templateId: string) {
    const template = await prisma.notificationTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundError('Notification template not found');
    }

    await prisma.notificationTemplate.delete({
      where: { id: templateId },
    });

    return { message: 'Notification template deleted successfully' };
  }

  // ===== BULK NOTIFICATIONS =====

  /**
   * Send bulk notification
   */
  async sendBulkNotification(data: any) {
    let recipientIds: string[] = [];

    // Get recipients based on type
    switch (data.recipientType) {
      case 'all':
        const allUsers = await prisma.user.findMany({
          select: { id: true },
        });
        recipientIds = allUsers.map(u => u.id);
        break;

      case 'department':
        if (!data.departmentIds || data.departmentIds.length === 0) {
          throw new BadRequestError('Department IDs required');
        }
        const deptEmployees = await prisma.employee.findMany({
          where: { departmentId: { in: data.departmentIds } },
          select: { userId: true },
        });
        recipientIds = deptEmployees.map(e => e.userId).filter(Boolean) as string[];
        break;

      case 'role':
        if (!data.roles || data.roles.length === 0) {
          throw new BadRequestError('Roles required');
        }
        const roleUsers = await prisma.user.findMany({
          where: { role: { in: data.roles } },
          select: { id: true },
        });
        recipientIds = roleUsers.map(u => u.id);
        break;

      case 'custom':
        if (!data.recipientIds || data.recipientIds.length === 0) {
          throw new BadRequestError('Recipient IDs required');
        }
        recipientIds = data.recipientIds;
        break;

      default:
        throw new BadRequestError('Invalid recipient type');
    }

    // Create notifications
    const notifications = await this.createNotification({
      ...data,
      recipientIds,
    });

    return {
      message: 'Bulk notification sent successfully',
      recipientCount: recipientIds.length,
      notifications,
    };
  }

  // ===== CHANNEL-SPECIFIC METHODS =====

  /**
   * Send email notification
   */
  private async sendEmailNotification(userId: string, data: any) {
    // Check user preferences
    const preferences = await this.getNotificationPreferences(userId);
    
    if (!preferences.emailPreferences || 
        !preferences.emailPreferences[data.category as keyof typeof preferences.emailPreferences]) {
      return;
    }

    // Get user email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true },
    });

    if (!user) return;

    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`📧 Email sent to ${user.email}: ${data.title}`);

    // Log email sent
    await prisma.notificationLog.create({
      data: {
        userId,
        channel: 'email',
        category: data.category,
        subject: data.title,
        content: data.message,
        status: 'sent',
      },
    });
  }

  /**
   * Send SMS notification
   */
  private async sendSmsNotification(userId: string, data: any) {
    // Check user preferences
    const preferences = await this.getNotificationPreferences(userId);
    
    if (!preferences.smsPreferences || 
        !preferences.smsPreferences[data.category as keyof typeof preferences.smsPreferences]) {
      return;
    }

    // Get user phone
    const employee = await prisma.employee.findFirst({
      where: { userId },
      select: { phone: true },
    });

    if (!employee?.phone) return;

    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log(`📱 SMS sent to ${employee.phone}: ${data.title}`);

    // Log SMS sent
    await prisma.notificationLog.create({
      data: {
        userId,
        channel: 'sms',
        category: data.category,
        subject: data.title,
        content: data.message,
        status: 'sent',
      },
    });
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(userId: string, data: any) {
    // Check user preferences
    const preferences = await this.getNotificationPreferences(userId);
    
    if (!preferences.pushPreferences || 
        !preferences.pushPreferences[data.category as keyof typeof preferences.pushPreferences]) {
      return;
    }

    // TODO: Integrate with push notification service (Firebase, OneSignal, etc.)
    console.log(`🔔 Push notification sent to user ${userId}: ${data.title}`);

    // Log push notification sent
    await prisma.notificationLog.create({
      data: {
        userId,
        channel: 'push',
        category: data.category,
        subject: data.title,
        content: data.message,
        status: 'sent',
      },
    });
  }

  /**
   * Get unread count for user
   */
  async getUnreadCount(userId: string) {
    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return { unreadCount: count };
  }
}

export default new NotificationService();
