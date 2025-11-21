import prisma from '@/lib/prisma';
import { NotFoundError, BadRequestError, ConflictError } from '@utils/errors';
import { cache, cacheKeys } from '@/lib/redis';
import config from '@config/index';
import { v4 as uuidv4 } from 'uuid';

interface UploadUTRInput {
  payslipId: string;
  utrNumber: string;
  actualPaymentDate: Date;
  bankReference?: string;
  remarks?: string;
  uploadedBy: string;
}

interface BulkUploadUTRInput {
  payments: Array<{
    payslipId: string;
    utrNumber: string;
    actualPaymentDate: Date;
    bankReference?: string;
  }>;
  uploadedBy: string;
}

interface CreatePaymentBatchInput {
  payrollCycleId: string;
  batchName: string;
  payslipIds: string[];
  scheduledPaymentDate: Date;
  paymentMode: string;
  remarks?: string;
  createdBy: string;
  companyId: string;
}

class PaymentService {
  /**
   * Upload UTR for a payslip
   */
  async uploadUTR(input: UploadUTRInput) {
    const { payslipId, utrNumber, actualPaymentDate, bankReference, remarks, uploadedBy } = input;

    // Validate UTR format
    if (config.utr.validationEnabled) {
      const utrRegex = new RegExp(config.utr.formatRegex);
      if (!utrRegex.test(utrNumber)) {
        throw new BadRequestError('Invalid UTR format');
      }
    }

    // Check if payslip exists
    const payslip = await prisma.payslip.findUnique({
      where: { id: payslipId },
      include: {
        employee: true,
        payrollCycle: true,
      },
    });

    if (!payslip) {
      throw new NotFoundError('Payslip not found');
    }

    // Check if UTR already exists
    const existingUTR = await prisma.uTR_Tracking.findUnique({
      where: { utr_number: utrNumber },
    });

    if (existingUTR) {
      throw new ConflictError('UTR number already exists');
    }

    // Create UTR tracking record in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create UTR tracking
      const utrTracking = await tx.uTR_Tracking.create({
        data: {
          utr_number: utrNumber,
          payslipId,
          employeeId: payslip.employeeId,
          companyId: payslip.companyId,
          payment_date: actualPaymentDate,
          amount: payslip.netSalary,
          payment_mode: 'bank_transfer',
          bank_reference: bankReference,
          status: 'completed',
          uploaded_by: uploadedBy,
          uploaded_at: new Date(),
        },
      });

      // Update payslip status
      await tx.payslip.update({
        where: { id: payslipId },
        data: {
          status: 'paid',
          paymentDate: actualPaymentDate,
          paymentMethod: 'bank_transfer',
          utrNumber,
        },
      });

      // Create audit trail
      await tx.uTR_AuditTrail.create({
        data: {
          utrTrackingId: utrTracking.id,
          action: 'utr_uploaded',
          performedBy: uploadedBy,
          performedAt: new Date(),
          details: {
            utrNumber,
            payslipId,
            actualPaymentDate,
            bankReference,
            remarks,
          },
        },
      });

      // Update employee payment history
      await tx.employee_PaymentHistory.create({
        data: {
          employeeId: payslip.employeeId,
          payslipId,
          payment_date: actualPaymentDate,
          amount_paid: payslip.netSalary,
          payment_mode: 'bank_transfer',
          utr_number: utrNumber,
          bank_reference: bankReference,
          status: 'completed',
        },
      });

      return utrTracking;
    });

    // Clear cache
    await cache.del(cacheKeys.payslip(payslipId));

    return result;
  }

  /**
   * Bulk upload UTRs
   */
  async bulkUploadUTR(input: BulkUploadUTRInput) {
    const { payments, uploadedBy } = input;

    const results = {
      successful: [] as any[],
      failed: [] as any[],
    };

    for (const payment of payments) {
      try {
        const result = await this.uploadUTR({
          ...payment,
          actualPaymentDate: new Date(payment.actualPaymentDate),
          uploadedBy,
        });
        results.successful.push({ payslipId: payment.payslipId, utrNumber: payment.utrNumber });
      } catch (error: any) {
        results.failed.push({
          payslipId: payment.payslipId,
          utrNumber: payment.utrNumber,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Create payment batch
   */
  async createPaymentBatch(input: CreatePaymentBatchInput) {
    const {
      payrollCycleId,
      batchName,
      payslipIds,
      scheduledPaymentDate,
      paymentMode,
      remarks,
      createdBy,
      companyId,
    } = input;

    // Validate payslips
    const payslips = await prisma.payslip.findMany({
      where: {
        id: { in: payslipIds },
        companyId,
        status: { in: ['approved', 'pending'] },
      },
    });

    if (payslips.length !== payslipIds.length) {
      throw new BadRequestError('Some payslips are invalid or already processed');
    }

    // Calculate total amount
    const totalAmount = payslips.reduce((sum, p) => sum + p.netSalary, 0);

    // Create batch
    const batch = await prisma.$transaction(async (tx) => {
      const paymentBatch = await tx.payment_Batch.create({
        data: {
          batch_number: `BATCH-${Date.now()}`,
          batch_name: batchName,
          payrollCycleId,
          companyId,
          payment_count: payslips.length,
          total_amount: totalAmount,
          scheduled_payment_date: scheduledPaymentDate,
          payment_mode: paymentMode,
          status: 'draft',
          created_by: createdBy,
          remarks,
        },
      });

      // Link payslips to batch
      await tx.payslip.updateMany({
        where: { id: { in: payslipIds } },
        data: { paymentBatchId: paymentBatch.id },
      });

      return paymentBatch;
    });

    return batch;
  }

  /**
   * Get payment batches
   */
  async getPaymentBatches(filters: any, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.payrollCycleId) where.payrollCycleId = filters.payrollCycleId;
    if (filters.status) where.status = filters.status;

    const [batches, total] = await Promise.all([
      prisma.payment_Batch.findMany({
        where,
        include: {
          payrollCycle: true,
          payslips: {
            include: {
              employee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  employeeCode: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.payment_Batch.count({ where }),
    ]);

    return { batches, total, page, limit };
  }

  /**
   * Get batch details
   */
  async getBatchDetails(batchId: string) {
    const batch = await prisma.payment_Batch.findUnique({
      where: { id: batchId },
      include: {
        payrollCycle: true,
        company: true,
        payslips: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
                email: true,
                bankAccountNumber: true,
                bankName: true,
                ifscCode: true,
              },
            },
            utrTracking: true,
          },
        },
      },
    });

    if (!batch) {
      throw new NotFoundError('Payment batch not found');
    }

    return batch;
  }

  /**
   * Mark batch as sent to bank
   */
  async markBatchSentToBank(
    batchId: string,
    bankFileReference: string,
    sentDate: Date,
    remarks: string | undefined,
    userId: string
  ) {
    const batch = await prisma.payment_Batch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new NotFoundError('Payment batch not found');
    }

    if (batch.status !== 'draft') {
      throw new BadRequestError('Only draft batches can be sent to bank');
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Update batch status
      const updatedBatch = await tx.payment_Batch.update({
        where: { id: batchId },
        data: {
          status: 'sent_to_bank',
          bank_file_reference: bankFileReference,
          sent_to_bank_at: sentDate,
          sent_by: userId,
          remarks,
        },
      });

      // Update payslips status
      await tx.payslip.updateMany({
        where: { paymentBatchId: batchId },
        data: { status: 'processing' },
      });

      return updatedBatch;
    });

    return updated;
  }

  /**
   * Confirm batch processing
   */
  async confirmBatchProcessing(
    batchId: string,
    bankConfirmationReference: string,
    processedDate: Date,
    remarks: string | undefined,
    userId: string
  ) {
    const batch = await prisma.payment_Batch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new NotFoundError('Payment batch not found');
    }

    if (batch.status !== 'sent_to_bank') {
      throw new BadRequestError('Batch must be in sent_to_bank status');
    }

    const updated = await prisma.payment_Batch.update({
      where: { id: batchId },
      data: {
        status: 'processing',
        bank_confirmation_reference: bankConfirmationReference,
        processed_at: processedDate,
        processed_by: userId,
        remarks,
      },
    });

    return updated;
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    payslipId: string,
    status: string,
    remarks: string | undefined,
    userId: string
  ) {
    const payslip = await prisma.payslip.findUnique({
      where: { id: payslipId },
    });

    if (!payslip) {
      throw new NotFoundError('Payslip not found');
    }

    const updated = await prisma.payslip.update({
      where: { id: payslipId },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    // Clear cache
    await cache.del(cacheKeys.payslip(payslipId));

    return updated;
  }

  /**
   * Reverse payment
   */
  async reversePayment(
    payslipId: string,
    reason: string,
    reversalDate: Date,
    reversalUTR: string | undefined,
    userId: string
  ) {
    const payslip = await prisma.payslip.findUnique({
      where: { id: payslipId },
      include: { utrTracking: true },
    });

    if (!payslip) {
      throw new NotFoundError('Payslip not found');
    }

    if (payslip.status !== 'paid') {
      throw new BadRequestError('Only paid payslips can be reversed');
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update payslip
      const updatedPayslip = await tx.payslip.update({
        where: { id: payslipId },
        data: {
          status: 'reversed',
          updatedAt: new Date(),
        },
      });

      // Update UTR tracking if exists
      if (payslip.utrTracking) {
        await tx.uTR_Tracking.update({
          where: { id: payslip.utrTracking.id },
          data: {
            status: 'reversed',
            reversal_date: reversalDate,
            reversal_utr: reversalUTR,
            reversal_reason: reason,
          },
        });

        // Create audit trail
        await tx.uTR_AuditTrail.create({
          data: {
            utrTrackingId: payslip.utrTracking.id,
            action: 'payment_reversed',
            performedBy: userId,
            performedAt: new Date(),
            details: {
              reason,
              reversalDate,
              reversalUTR,
            },
          },
        });
      }

      return updatedPayslip;
    });

    // Clear cache
    await cache.del(cacheKeys.payslip(payslipId));

    return result;
  }

  /**
   * Get payments list
   */
  async getPayments(filters: any, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.payrollCycleId) where.payrollCycleId = filters.payrollCycleId;
    if (filters.batchId) where.paymentBatchId = filters.batchId;
    if (filters.status) where.status = filters.status;
    if (filters.employeeId) where.employeeId = filters.employeeId;

    if (filters.startDate || filters.endDate) {
      where.paymentDate = {};
      if (filters.startDate) where.paymentDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.paymentDate.lte = new Date(filters.endDate);
    }

    const [payments, total] = await Promise.all([
      prisma.payslip.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
            },
          },
          payrollCycle: true,
          utrTracking: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payslip.count({ where }),
    ]);

    return { payments, total, page, limit };
  }

  /**
   * Get unpaid salaries
   */
  async getUnpaidSalaries(filters: any, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const where: any = {
      status: { in: ['approved', 'pending'] },
    };

    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.payrollCycleId) where.payrollCycleId = filters.payrollCycleId;
    if (filters.employeeId) where.employeeId = filters.employeeId;

    const [unpaidSalaries, total] = await Promise.all([
      prisma.payslip.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              bankAccountNumber: true,
              bankName: true,
              ifscCode: true,
            },
          },
          payrollCycle: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payslip.count({ where }),
    ]);

    return { unpaidSalaries, total, page, limit };
  }

  /**
   * Get payment history for employee
   */
  async getPaymentHistory(
    employeeId: string,
    filters: any,
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;

    const where: any = { employeeId };

    if (filters.startDate || filters.endDate) {
      where.payment_date = {};
      if (filters.startDate) where.payment_date.gte = new Date(filters.startDate);
      if (filters.endDate) where.payment_date.lte = new Date(filters.endDate);
    }

    const [history, total] = await Promise.all([
      prisma.employee_PaymentHistory.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
            },
          },
          payslip: {
            include: {
              payrollCycle: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { payment_date: 'desc' },
      }),
      prisma.employee_PaymentHistory.count({ where }),
    ]);

    return { history, total, page, limit };
  }

  /**
   * Search UTR
   */
  async searchUTR(filters: any) {
    const where: any = {};

    if (filters.utrNumber) where.utr_number = { contains: filters.utrNumber };
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.companyId) where.companyId = filters.companyId;

    if (filters.startDate || filters.endDate) {
      where.payment_date = {};
      if (filters.startDate) where.payment_date.gte = new Date(filters.startDate);
      if (filters.endDate) where.payment_date.lte = new Date(filters.endDate);
    }

    const results = await prisma.uTR_Tracking.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
        payslip: {
          include: {
            payrollCycle: true,
          },
        },
      },
      take: 50,
      orderBy: { payment_date: 'desc' },
    });

    return results;
  }

  /**
   * Validate UTR format
   */
  validateUTRFormat(utrNumber: string): { valid: boolean; message?: string } {
    if (!config.utr.validationEnabled) {
      return { valid: true };
    }

    const utrRegex = new RegExp(config.utr.formatRegex);
    if (!utrRegex.test(utrNumber)) {
      return {
        valid: false,
        message: 'UTR must be 16-22 alphanumeric characters',
      };
    }

    return { valid: true };
  }

  /**
   * Add payments to batch
   */
  async addPaymentsToBatch(batchId: string, payslipIds: string[], userId: string) {
    const batch = await prisma.payment_Batch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new NotFoundError('Payment batch not found');
    }

    if (batch.status !== 'draft') {
      throw new BadRequestError('Can only add payments to draft batches');
    }

    // Validate payslips
    const payslips = await prisma.payslip.findMany({
      where: {
        id: { in: payslipIds },
        companyId: batch.companyId,
        status: { in: ['approved', 'pending'] },
        paymentBatchId: null,
      },
    });

    if (payslips.length !== payslipIds.length) {
      throw new BadRequestError('Some payslips are invalid or already in a batch');
    }

    const additionalAmount = payslips.reduce((sum, p) => sum + p.netSalary, 0);

    const updated = await prisma.$transaction(async (tx) => {
      // Update payslips
      await tx.payslip.updateMany({
        where: { id: { in: payslipIds } },
        data: { paymentBatchId: batchId },
      });

      // Update batch totals
      return await tx.payment_Batch.update({
        where: { id: batchId },
        data: {
          payment_count: { increment: payslips.length },
          total_amount: { increment: additionalAmount },
        },
      });
    });

    return updated;
  }

  /**
   * Remove payment from batch
   */
  async removePaymentFromBatch(batchId: string, payslipId: string, userId: string) {
    const batch = await prisma.payment_Batch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new NotFoundError('Payment batch not found');
    }

    if (batch.status !== 'draft') {
      throw new BadRequestError('Can only remove payments from draft batches');
    }

    const payslip = await prisma.payslip.findUnique({
      where: { id: payslipId },
    });

    if (!payslip || payslip.paymentBatchId !== batchId) {
      throw new BadRequestError('Payslip not in this batch');
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Remove from batch
      await tx.payslip.update({
        where: { id: payslipId },
        data: { paymentBatchId: null },
      });

      // Update batch totals
      return await tx.payment_Batch.update({
        where: { id: batchId },
        data: {
          payment_count: { decrement: 1 },
          total_amount: { decrement: payslip.netSalary },
        },
      });
    });

    return updated;
  }
}

export default new PaymentService();
