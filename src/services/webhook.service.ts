import prisma from '@/lib/prisma';
import { cache } from '@/lib/redis';
import crypto from 'crypto';
import axios from 'axios';
import { 
  NotFoundError, 
  ConflictError, 
  BadRequestError,
  ForbiddenError 
} from '@utils/errors';

class WebhookService {
  /**
   * Get webhooks
   */
  async getWebhooks(
    filters: any,
    page: number = 1,
    limit: number = 50,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    // Multi-tenant filter
    if (!requestingUser.isSuperAdmin && requestingUser.companyId) {
      where.companyId = requestingUser.companyId;
    }

    if (filters.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters.event) {
      where.events = {
        has: filters.event,
      };
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive === 'true';
    }

    const [webhooks, total] = await Promise.all([
      prisma.webhook.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.webhook.count({ where }),
    ]);

    return { webhooks, total, page, limit };
  }

  /**
   * Get webhook by ID
   */
  async getWebhookById(webhookId: string) {
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
      include: {
        _count: {
          select: {
            logs: true,
          },
        },
      },
    });

    if (!webhook) {
      throw new NotFoundError('Webhook not found');
    }

    return webhook;
  }

  /**
   * Create webhook
   */
  async createWebhook(
    data: any,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    // Multi-tenant check
    let companyId = data.companyId;
    if (!requestingUser.isSuperAdmin) {
      companyId = requestingUser.companyId;
    }

    // Generate secret if not provided
    const secret = data.secret || this.generateSecret();

    const webhook = await prisma.webhook.create({
      data: {
        name: data.name,
        url: data.url,
        companyId,
        events: data.events,
        secret,
        headers: data.headers || {},
        retryOnFailure: data.retryOnFailure !== false,
        maxRetries: data.maxRetries || 3,
        isActive: true,
      },
    });

    return webhook;
  }

  /**
   * Update webhook
   */
  async updateWebhook(
    webhookId: string,
    data: any,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      throw new NotFoundError('Webhook not found');
    }

    // Multi-tenant check
    if (!requestingUser.isSuperAdmin && webhook.companyId !== requestingUser.companyId) {
      throw new ForbiddenError('Access denied');
    }

    const updated = await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        name: data.name,
        url: data.url,
        events: data.events,
        secret: data.secret,
        headers: data.headers,
        isActive: data.isActive,
        retryOnFailure: data.retryOnFailure,
        maxRetries: data.maxRetries,
      },
    });

    return updated;
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(
    webhookId: string,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      throw new NotFoundError('Webhook not found');
    }

    // Multi-tenant check
    if (!requestingUser.isSuperAdmin && webhook.companyId !== requestingUser.companyId) {
      throw new ForbiddenError('Access denied');
    }

    await prisma.webhook.delete({
      where: { id: webhookId },
    });

    return { message: 'Webhook deleted successfully' };
  }

  /**
   * Trigger webhook
   */
  async triggerWebhook(event: string, payload: any, companyId?: string) {
    // Get all active webhooks subscribed to this event
    const where: any = {
      isActive: true,
      events: {
        has: event,
      },
    };

    if (companyId) {
      where.companyId = companyId;
    }

    const webhooks = await prisma.webhook.findMany({ where });

    const results: any[] = [];

    for (const webhook of webhooks) {
      try {
        const result = await this.executeWebhook(webhook, event, payload);
        results.push(result);
      } catch (error: any) {
        console.error(`Webhook execution failed for ${webhook.id}:`, error.message);
      }
    }

    return results;
  }

  /**
   * Execute webhook
   */
  private async executeWebhook(webhook: any, event: string, payload: any) {
    const timestamp = Date.now();
    
    // Prepare webhook payload
    const webhookPayload = {
      event,
      timestamp,
      data: payload,
    };

    // Generate signature
    const signature = this.generateSignature(webhookPayload, webhook.secret);

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Event': event,
      'X-Webhook-Timestamp': timestamp.toString(),
      ...webhook.headers,
    };

    let logData: any = {
      webhookId: webhook.id,
      event,
      payload: webhookPayload,
      status: 'pending',
      attempt: 1,
    };

    try {
      // Make HTTP request
      const response = await axios.post(webhook.url, webhookPayload, {
        headers,
        timeout: 30000, // 30 seconds
      });

      // Log success
      logData = {
        ...logData,
        status: 'success',
        statusCode: response.status,
        response: response.data,
      };

      await prisma.webhookLog.create({ data: logData });

      // Update last triggered
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: { lastTriggeredAt: new Date() },
      });

      return { success: true, webhookId: webhook.id, logData };

    } catch (error: any) {
      // Log failure
      logData = {
        ...logData,
        status: 'failed',
        statusCode: error.response?.status || 0,
        errorMessage: error.message,
        response: error.response?.data,
      };

      await prisma.webhookLog.create({ data: logData });

      // Retry if enabled
      if (webhook.retryOnFailure && logData.attempt < webhook.maxRetries) {
        setTimeout(() => {
          this.retryWebhook(webhook, event, payload, logData.attempt + 1);
        }, this.getRetryDelay(logData.attempt));
      }

      return { success: false, webhookId: webhook.id, error: error.message };
    }
  }

  /**
   * Retry webhook execution
   */
  private async retryWebhook(webhook: any, event: string, payload: any, attempt: number) {
    const timestamp = Date.now();
    
    const webhookPayload = {
      event,
      timestamp,
      data: payload,
    };

    const signature = this.generateSignature(webhookPayload, webhook.secret);

    const headers = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Event': event,
      'X-Webhook-Timestamp': timestamp.toString(),
      'X-Webhook-Retry': attempt.toString(),
      ...webhook.headers,
    };

    let logData: any = {
      webhookId: webhook.id,
      event,
      payload: webhookPayload,
      status: 'pending',
      attempt,
    };

    try {
      const response = await axios.post(webhook.url, webhookPayload, {
        headers,
        timeout: 30000,
      });

      logData = {
        ...logData,
        status: 'success',
        statusCode: response.status,
        response: response.data,
      };

      await prisma.webhookLog.create({ data: logData });

      await prisma.webhook.update({
        where: { id: webhook.id },
        data: { lastTriggeredAt: new Date() },
      });

    } catch (error: any) {
      logData = {
        ...logData,
        status: 'failed',
        statusCode: error.response?.status || 0,
        errorMessage: error.message,
        response: error.response?.data,
      };

      await prisma.webhookLog.create({ data: logData });

      // Retry again if under max retries
      if (attempt < webhook.maxRetries) {
        setTimeout(() => {
          this.retryWebhook(webhook, event, payload, attempt + 1);
        }, this.getRetryDelay(attempt));
      }
    }
  }

  /**
   * Test webhook
   */
  async testWebhook(webhookId: string, testPayload?: any) {
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      throw new NotFoundError('Webhook not found');
    }

    const payload = testPayload || {
      message: 'This is a test webhook',
      timestamp: new Date().toISOString(),
    };

    const result = await this.executeWebhook(webhook, 'webhook.test', payload);

    return result;
  }

  /**
   * Get webhook logs
   */
  async getWebhookLogs(
    webhookId: string,
    filters: any,
    page: number = 1,
    limit: number = 50
  ) {
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      throw new NotFoundError('Webhook not found');
    }

    const skip = (page - 1) * limit;
    const where: any = { webhookId };

    if (filters.status) {
      where.status = filters.status;
    }

    const [logs, total] = await Promise.all([
      prisma.webhookLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.webhookLog.count({ where }),
    ]);

    return { logs, total, page, limit };
  }

  /**
   * Retry failed webhook
   */
  async retryFailedWebhook(webhookId: string, logId: string) {
    const log = await prisma.webhookLog.findFirst({
      where: {
        id: logId,
        webhookId,
      },
    });

    if (!log) {
      throw new NotFoundError('Webhook log not found');
    }

    if (log.status !== 'failed') {
      throw new BadRequestError('Can only retry failed webhooks');
    }

    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      throw new NotFoundError('Webhook not found');
    }

    // Retry the webhook
    const result = await this.executeWebhook(
      webhook,
      log.event,
      log.payload.data
    );

    return result;
  }

  // ===== HELPER METHODS =====

  /**
   * Generate webhook secret
   */
  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate signature for webhook payload
   */
  private generateSignature(payload: any, secret: string): string {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Calculate retry delay (exponential backoff)
   */
  private getRetryDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    return Math.min(1000 * Math.pow(2, attempt - 1), 60000); // Max 60 seconds
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: any, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

export default new WebhookService();
