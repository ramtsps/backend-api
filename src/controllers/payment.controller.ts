import { Request, Response } from 'express';
import paymentService from '@services/payment.service';
import { successResponse, createdResponse, paginatedResponse } from '@utils/response';
import { asyncHandler } from '@middleware/error.middleware';

class PaymentController {
  /**
   * Upload UTR for payslip
   * @route POST /api/v1/payments/payslips/:payslipId/utr
   */
  uploadUTR = asyncHandler(async (req: Request, res: Response) => {
    const { payslipId } = req.params;
    const { utrNumber, actualPaymentDate, bankReference, remarks } = req.body;

    const result = await paymentService.uploadUTR({
      payslipId,
      utrNumber,
      actualPaymentDate: new Date(actualPaymentDate),
      bankReference,
      remarks,
      uploadedBy: req.user!.userId,
    });

    return successResponse(res, result, 'UTR uploaded successfully');
  });

  /**
   * Bulk upload UTRs
   * @route POST /api/v1/payments/utr/bulk-upload
   */
  bulkUploadUTR = asyncHandler(async (req: Request, res: Response) => {
    const { payments } = req.body;

    const result = await paymentService.bulkUploadUTR({
      payments,
      uploadedBy: req.user!.userId,
    });

    return successResponse(res, result, 'Bulk UTR upload completed');
  });

  /**
   * Create payment batch
   * @route POST /api/v1/payments/batches
   */
  createPaymentBatch = asyncHandler(async (req: Request, res: Response) => {
    const {
      payrollCycleId,
      batchName,
      payslipIds,
      scheduledPaymentDate,
      paymentMode,
      remarks,
    } = req.body;

    const result = await paymentService.createPaymentBatch({
      payrollCycleId,
      batchName,
      payslipIds,
      scheduledPaymentDate: new Date(scheduledPaymentDate),
      paymentMode,
      remarks,
      createdBy: req.user!.userId,
      companyId: req.user!.companyId!,
    });

    return createdResponse(res, result, 'Payment batch created successfully');
  });

  /**
   * Get payment batches
   * @route GET /api/v1/payments/batches
   */
  getPaymentBatches = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const filters = {
      companyId: req.user?.isSuperAdmin ? req.query.companyId : req.user?.companyId,
      payrollCycleId: req.query.payrollCycleId,
      status: req.query.status,
    };

    const result = await paymentService.getPaymentBatches(filters, page, limit);

    return paginatedResponse(
      res,
      result.batches,
      page,
      limit,
      result.total,
      'Payment batches retrieved successfully'
    );
  });

  /**
   * Get batch details
   * @route GET /api/v1/payments/batches/:batchId
   */
  getBatchDetails = asyncHandler(async (req: Request, res: Response) => {
    const { batchId } = req.params;
    const result = await paymentService.getBatchDetails(batchId);
    return successResponse(res, result, 'Batch details retrieved successfully');
  });

  /**
   * Mark batch as sent to bank
   * @route POST /api/v1/payments/batches/:batchId/send-to-bank
   */
  markBatchSentToBank = asyncHandler(async (req: Request, res: Response) => {
    const { batchId } = req.params;
    const { bankFileReference, sentDate, remarks } = req.body;

    const result = await paymentService.markBatchSentToBank(
      batchId,
      bankFileReference,
      new Date(sentDate),
      remarks,
      req.user!.userId
    );

    return successResponse(res, result, 'Batch marked as sent to bank');
  });

  /**
   * Confirm batch processing
   * @route POST /api/v1/payments/batches/:batchId/confirm-processing
   */
  confirmBatchProcessing = asyncHandler(async (req: Request, res: Response) => {
    const { batchId } = req.params;
    const { bankConfirmationReference, processedDate, remarks } = req.body;

    const result = await paymentService.confirmBatchProcessing(
      batchId,
      bankConfirmationReference,
      new Date(processedDate),
      remarks,
      req.user!.userId
    );

    return successResponse(res, result, 'Batch processing confirmed');
  });

  /**
   * Update payment status
   * @route PATCH /api/v1/payments/payslips/:payslipId/status
   */
  updatePaymentStatus = asyncHandler(async (req: Request, res: Response) => {
    const { payslipId } = req.params;
    const { status, remarks } = req.body;

    const result = await paymentService.updatePaymentStatus(
      payslipId,
      status,
      remarks,
      req.user!.userId
    );

    return successResponse(res, result, 'Payment status updated successfully');
  });

  /**
   * Reverse payment
   * @route POST /api/v1/payments/payslips/:payslipId/reverse
   */
  reversePayment = asyncHandler(async (req: Request, res: Response) => {
    const { payslipId } = req.params;
    const { reason, reversalDate, reversalUTR } = req.body;

    const result = await paymentService.reversePayment(
      payslipId,
      reason,
      new Date(reversalDate),
      reversalUTR,
      req.user!.userId
    );

    return successResponse(res, result, 'Payment reversed successfully');
  });

  /**
   * Get payments list
   * @route GET /api/v1/payments
   */
  getPayments = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const filters = {
      companyId: req.user?.isSuperAdmin ? req.query.companyId : req.user?.companyId,
      payrollCycleId: req.query.payrollCycleId,
      batchId: req.query.batchId,
      status: req.query.status,
      employeeId: req.query.employeeId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const result = await paymentService.getPayments(filters, page, limit);

    return paginatedResponse(
      res,
      result.payments,
      page,
      limit,
      result.total,
      'Payments retrieved successfully'
    );
  });

  /**
   * Get unpaid salaries
   * @route GET /api/v1/payments/unpaid
   */
  getUnpaidSalaries = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const filters = {
      companyId: req.user?.isSuperAdmin ? req.query.companyId : req.user?.companyId,
      payrollCycleId: req.query.payrollCycleId,
      employeeId: req.query.employeeId,
    };

    const result = await paymentService.getUnpaidSalaries(filters, page, limit);

    return paginatedResponse(
      res,
      result.unpaidSalaries,
      page,
      limit,
      result.total,
      'Unpaid salaries retrieved successfully'
    );
  });

  /**
   * Get payment history for employee
   * @route GET /api/v1/payments/employees/:employeeId/history
   */
  getPaymentHistory = asyncHandler(async (req: Request, res: Response) => {
    const { employeeId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const result = await paymentService.getPaymentHistory(employeeId, filters, page, limit);

    return paginatedResponse(
      res,
      result.history,
      page,
      limit,
      result.total,
      'Payment history retrieved successfully'
    );
  });

  /**
   * Search UTR
   * @route GET /api/v1/payments/utr/search
   */
  searchUTR = asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      utrNumber: req.query.utrNumber,
      employeeId: req.query.employeeId,
      companyId: req.user?.isSuperAdmin ? req.query.companyId : req.user?.companyId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const result = await paymentService.searchUTR(filters);
    return successResponse(res, result, 'UTR search completed');
  });

  /**
   * Validate UTR format
   * @route POST /api/v1/payments/utr/validate
   */
  validateUTR = asyncHandler(async (req: Request, res: Response) => {
    const { utrNumber } = req.body;
    const result = paymentService.validateUTRFormat(utrNumber);
    return successResponse(res, result, 'UTR validation completed');
  });

  /**
   * Add payments to batch
   * @route POST /api/v1/payments/batches/:batchId/payments
   */
  addPaymentsToBatch = asyncHandler(async (req: Request, res: Response) => {
    const { batchId } = req.params;
    const { payslipIds } = req.body;

    const result = await paymentService.addPaymentsToBatch(
      batchId,
      payslipIds,
      req.user!.userId
    );

    return successResponse(res, result, 'Payments added to batch successfully');
  });

  /**
   * Remove payment from batch
   * @route DELETE /api/v1/payments/batches/:batchId/payments/:payslipId
   */
  removePaymentFromBatch = asyncHandler(async (req: Request, res: Response) => {
    const { batchId, payslipId } = req.params;

    const result = await paymentService.removePaymentFromBatch(
      batchId,
      payslipId,
      req.user!.userId
    );

    return successResponse(res, result, 'Payment removed from batch successfully');
  });
}

export default new PaymentController();
