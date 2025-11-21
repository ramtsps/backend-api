import { Router } from 'express';
import paymentController from '@controllers/payment.controller';
import { validate } from '@middleware/validation.middleware';
import { authenticate, authorize } from '@middleware/auth.middleware';
import {
  uploadUTRSchema,
  bulkUploadUTRSchema,
  createPaymentBatchSchema,
  updatePaymentStatusSchema,
  markBatchSentSchema,
  confirmBatchProcessingSchema,
  reversePaymentSchema,
  addPaymentToBatchSchema,
  removePaymentFromBatchSchema,
  getPaymentsSchema,
  getPaymentBatchesSchema,
  getUnpaidSalariesSchema,
  getPaymentHistorySchema,
  validateUTRSchema,
  searchUTRSchema,
} from '@validators/payment.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// UTR Management
router.post(
  '/payslips/:payslipId/utr',
  authorize(['admin', 'hr', 'finance', 'accounts']),
  validate(uploadUTRSchema),
  paymentController.uploadUTR
);

router.post(
  '/utr/bulk-upload',
  authorize(['admin', 'hr', 'finance', 'accounts']),
  validate(bulkUploadUTRSchema),
  paymentController.bulkUploadUTR
);

router.get(
  '/utr/search',
  validate(searchUTRSchema),
  paymentController.searchUTR
);

router.post(
  '/utr/validate',
  validate(validateUTRSchema),
  paymentController.validateUTR
);

// Payment Batches
router.post(
  '/batches',
  authorize(['admin', 'hr', 'finance', 'accounts']),
  validate(createPaymentBatchSchema),
  paymentController.createPaymentBatch
);

router.get(
  '/batches',
  validate(getPaymentBatchesSchema),
  paymentController.getPaymentBatches
);

router.get(
  '/batches/:batchId',
  paymentController.getBatchDetails
);

router.post(
  '/batches/:batchId/send-to-bank',
  authorize(['admin', 'finance', 'accounts']),
  validate(markBatchSentSchema),
  paymentController.markBatchSentToBank
);

router.post(
  '/batches/:batchId/confirm-processing',
  authorize(['admin', 'finance', 'accounts']),
  validate(confirmBatchProcessingSchema),
  paymentController.confirmBatchProcessing
);

router.post(
  '/batches/:batchId/payments',
  authorize(['admin', 'hr', 'finance', 'accounts']),
  validate(addPaymentToBatchSchema),
  paymentController.addPaymentsToBatch
);

router.delete(
  '/batches/:batchId/payments/:payslipId',
  authorize(['admin', 'hr', 'finance', 'accounts']),
  validate(removePaymentFromBatchSchema),
  paymentController.removePaymentFromBatch
);

// Payment Management
router.get(
  '/',
  validate(getPaymentsSchema),
  paymentController.getPayments
);

router.get(
  '/unpaid',
  validate(getUnpaidSalariesSchema),
  paymentController.getUnpaidSalaries
);

router.patch(
  '/payslips/:payslipId/status',
  authorize(['admin', 'hr', 'finance', 'accounts']),
  validate(updatePaymentStatusSchema),
  paymentController.updatePaymentStatus
);

router.post(
  '/payslips/:payslipId/reverse',
  authorize(['admin', 'finance', 'accounts']),
  validate(reversePaymentSchema),
  paymentController.reversePayment
);

// Employee Payment History
router.get(
  '/employees/:employeeId/history',
  validate(getPaymentHistorySchema),
  paymentController.getPaymentHistory
);

export default router;
