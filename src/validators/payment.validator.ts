import { z } from 'zod';

// Upload UTR
export const uploadUTRSchema = z.object({
  params: z.object({
    payslipId: z.string().uuid(),
  }),
  body: z.object({
    utrNumber: z.string().min(16).max(22),
    actualPaymentDate: z.string().datetime(),
    bankReference: z.string().optional(),
    remarks: z.string().optional(),
  }),
});

// Bulk upload UTR
export const bulkUploadUTRSchema = z.object({
  body: z.object({
    payments: z.array(z.object({
      payslipId: z.string().uuid(),
      utrNumber: z.string().min(16).max(22),
      actualPaymentDate: z.string().datetime(),
      bankReference: z.string().optional(),
    })),
  }),
});

// Create payment batch
export const createPaymentBatchSchema = z.object({
  body: z.object({
    payrollCycleId: z.string().uuid(),
    batchName: z.string().min(1),
    payslipIds: z.array(z.string().uuid()),
    scheduledPaymentDate: z.string().datetime(),
    paymentMode: z.enum(['bank_transfer', 'cheque', 'cash', 'upi', 'other']),
    remarks: z.string().optional(),
  }),
});

// Update payment status
export const updatePaymentStatusSchema = z.object({
  params: z.object({
    payslipId: z.string().uuid(),
  }),
  body: z.object({
    status: z.enum(['pending', 'processing', 'completed', 'failed', 'reversed']),
    remarks: z.string().optional(),
  }),
});

// Mark batch as sent to bank
export const markBatchSentSchema = z.object({
  params: z.object({
    batchId: z.string().uuid(),
  }),
  body: z.object({
    bankFileReference: z.string().optional(),
    sentDate: z.string().datetime(),
    remarks: z.string().optional(),
  }),
});

// Confirm batch processing
export const confirmBatchProcessingSchema = z.object({
  params: z.object({
    batchId: z.string().uuid(),
  }),
  body: z.object({
    bankConfirmationReference: z.string(),
    processedDate: z.string().datetime(),
    remarks: z.string().optional(),
  }),
});

// Reverse payment
export const reversePaymentSchema = z.object({
  params: z.object({
    payslipId: z.string().uuid(),
  }),
  body: z.object({
    reason: z.string().min(1),
    reversalDate: z.string().datetime(),
    reversalUTR: z.string().optional(),
  }),
});

// Add payment to batch
export const addPaymentToBatchSchema = z.object({
  params: z.object({
    batchId: z.string().uuid(),
  }),
  body: z.object({
    payslipIds: z.array(z.string().uuid()),
  }),
});

// Remove payment from batch
export const removePaymentFromBatchSchema = z.object({
  params: z.object({
    batchId: z.string().uuid(),
    payslipId: z.string().uuid(),
  }),
});

// Get payments list
export const getPaymentsSchema = z.object({
  query: z.object({
    companyId: z.string().uuid().optional(),
    payrollCycleId: z.string().uuid().optional(),
    batchId: z.string().uuid().optional(),
    status: z.enum(['pending', 'processing', 'completed', 'failed', 'reversed']).optional(),
    employeeId: z.string().uuid().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

// Get payment batches
export const getPaymentBatchesSchema = z.object({
  query: z.object({
    companyId: z.string().uuid().optional(),
    payrollCycleId: z.string().uuid().optional(),
    status: z.enum(['draft', 'sent_to_bank', 'processing', 'completed', 'failed']).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

// Export batch file
export const exportBatchFileSchema = z.object({
  params: z.object({
    batchId: z.string().uuid(),
  }),
  query: z.object({
    format: z.enum(['csv', 'excel', 'txt']).optional(),
  }),
});

// Get unpaid salaries
export const getUnpaidSalariesSchema = z.object({
  query: z.object({
    companyId: z.string().uuid().optional(),
    payrollCycleId: z.string().uuid().optional(),
    employeeId: z.string().uuid().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

// Get payment history
export const getPaymentHistorySchema = z.object({
  params: z.object({
    employeeId: z.string().uuid(),
  }),
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

// Validate UTR format
export const validateUTRSchema = z.object({
  body: z.object({
    utrNumber: z.string().min(16).max(22),
  }),
});

// Search UTR
export const searchUTRSchema = z.object({
  query: z.object({
    utrNumber: z.string().optional(),
    employeeId: z.string().uuid().optional(),
    companyId: z.string().uuid().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});
