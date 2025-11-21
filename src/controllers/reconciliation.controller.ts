import { Request, Response } from 'express';
import reconciliationService from '@services/reconciliation.service';
import { successResponse, createdResponse, paginatedResponse } from '@utils/response';
import { asyncHandler } from '@middleware/error.middleware';

class ReconciliationController {
  /**
   * Perform reconciliation
   * @route POST /api/v1/reconciliation
   */
  performReconciliation = asyncHandler(async (req: Request, res: Response) => {
    const { payrollCycleId, bankData, erpData } = req.body;

    const result = await reconciliationService.performReconciliation({
      payrollCycleId,
      bankData,
      erpData,
      performedBy: req.user!.userId,
      companyId: req.user!.companyId!,
    });

    return createdResponse(res, result, 'Reconciliation performed successfully');
  });

  /**
   * Get reconciliations
   * @route GET /api/v1/reconciliation
   */
  getReconciliations = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const filters = {
      companyId: req.user?.isSuperAdmin ? req.query.companyId : req.user?.companyId,
      payrollCycleId: req.query.payrollCycleId,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const result = await reconciliationService.getReconciliations(filters, page, limit);

    return paginatedResponse(
      res,
      result.reconciliations,
      page,
      limit,
      result.total,
      'Reconciliations retrieved successfully'
    );
  });

  /**
   * Get reconciliation details
   * @route GET /api/v1/reconciliation/:id
   */
  getReconciliationDetails = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await reconciliationService.getReconciliationDetails(id);
    return successResponse(res, result, 'Reconciliation details retrieved successfully');
  });

  /**
   * Resolve discrepancy
   * @route POST /api/v1/reconciliation/items/:itemId/resolve
   */
  resolveDiscrepancy = asyncHandler(async (req: Request, res: Response) => {
    const { itemId } = req.params;
    const { resolution, remarks } = req.body;

    const result = await reconciliationService.resolveDiscrepancy(
      itemId,
      resolution,
      remarks,
      req.user!.userId
    );

    return successResponse(res, result, 'Discrepancy resolved successfully');
  });

  /**
   * Export reconciliation report
   * @route GET /api/v1/reconciliation/:id/export
   */
  exportReconciliationReport = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await reconciliationService.exportReconciliationReport(id);
    return successResponse(res, result, 'Reconciliation report exported successfully');
  });

  /**
   * Get reconciliation statistics
   * @route GET /api/v1/reconciliation/stats
   */
  getReconciliationStats = asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.user?.isSuperAdmin
      ? (req.query.companyId as string)
      : req.user!.companyId!;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const result = await reconciliationService.getReconciliationStats(
      companyId,
      startDate,
      endDate
    );

    return successResponse(res, result, 'Reconciliation statistics retrieved successfully');
  });

  /**
   * Auto-match payments
   * @route POST /api/v1/reconciliation/auto-match
   */
  autoMatchPayments = asyncHandler(async (req: Request, res: Response) => {
    const { payrollCycleId, bankData } = req.body;

    const result = await reconciliationService.autoMatchPayments(
      payrollCycleId,
      bankData,
      req.user!.userId
    );

    return successResponse(res, result, 'Auto-matching completed');
  });
}

export default new ReconciliationController();
