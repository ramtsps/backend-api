import { Request, Response } from 'express';
import expenseService from '@services/expense.service';
import { successResponse, createdResponse, paginatedResponse } from '@utils/response';
import { asyncHandler } from '@middleware/error.middleware';

class ExpenseController {
  // ===== EXPENSE CATEGORIES =====

  /**
   * Get expense categories
   * @route GET /api/v1/expenses/categories
   */
  getExpenseCategories = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const filters = {
      companyId: req.query.companyId,
      isActive: req.query.isActive,
    };

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const result = await expenseService.getExpenseCategories(filters, page, limit, requestingUser);

    return paginatedResponse(
      res,
      result.categories,
      page,
      limit,
      result.total,
      'Expense categories retrieved successfully'
    );
  });

  /**
   * Create expense category
   * @route POST /api/v1/expenses/categories
   */
  createExpenseCategory = asyncHandler(async (req: Request, res: Response) => {
    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const category = await expenseService.createExpenseCategory(req.body, requestingUser);
    return createdResponse(res, category, 'Expense category created successfully');
  });

  /**
   * Update expense category
   * @route PUT /api/v1/expenses/categories/:id
   */
  updateExpenseCategory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const category = await expenseService.updateExpenseCategory(id, req.body);
    return successResponse(res, category, 'Expense category updated successfully');
  });

  /**
   * Delete expense category
   * @route DELETE /api/v1/expenses/categories/:id
   */
  deleteExpenseCategory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await expenseService.deleteExpenseCategory(id);
    return successResponse(res, result, 'Expense category deleted successfully');
  });

  // ===== EXPENSE CLAIMS =====

  /**
   * Get expense claims
   * @route GET /api/v1/expenses/claims
   */
  getExpenseClaims = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const filters = {
      employeeId: req.query.employeeId,
      categoryId: req.query.categoryId,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    };

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const result = await expenseService.getExpenseClaims(filters, page, limit, requestingUser);

    return paginatedResponse(
      res,
      result.expenseClaims,
      page,
      limit,
      result.total,
      'Expense claims retrieved successfully'
    );
  });

  /**
   * Get expense claim by ID
   * @route GET /api/v1/expenses/claims/:id
   */
  getExpenseClaimById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const expenseClaim = await expenseService.getExpenseClaimById(id);
    return successResponse(res, expenseClaim, 'Expense claim retrieved successfully');
  });

  /**
   * Create expense claim
   * @route POST /api/v1/expenses/claims
   */
  createExpenseClaim = asyncHandler(async (req: Request, res: Response) => {
    const expenseClaim = await expenseService.createExpenseClaim(req.body);
    return createdResponse(res, expenseClaim, 'Expense claim created successfully');
  });

  /**
   * Update expense claim
   * @route PUT /api/v1/expenses/claims/:id
   */
  updateExpenseClaim = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const expenseClaim = await expenseService.updateExpenseClaim(id, req.body);
    return successResponse(res, expenseClaim, 'Expense claim updated successfully');
  });

  /**
   * Delete expense claim
   * @route DELETE /api/v1/expenses/claims/:id
   */
  deleteExpenseClaim = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await expenseService.deleteExpenseClaim(id);
    return successResponse(res, result, 'Expense claim deleted successfully');
  });

  /**
   * Submit expense claim
   * @route POST /api/v1/expenses/claims/:id/submit
   */
  submitExpenseClaim = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const expenseClaim = await expenseService.submitExpenseClaim(id);
    return successResponse(res, expenseClaim, 'Expense claim submitted successfully');
  });

  /**
   * Approve/Reject expense claim
   * @route PATCH /api/v1/expenses/claims/:id/approve
   */
  approveExpenseClaim = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, approvedAmount, remarks } = req.body;

    const expenseClaim = await expenseService.approveExpenseClaim(
      id,
      status,
      approvedAmount,
      remarks,
      req.user!.userId
    );

    return successResponse(res, expenseClaim, `Expense claim ${status} successfully`);
  });

  /**
   * Reimburse expense claim
   * @route POST /api/v1/expenses/claims/:id/reimburse
   */
  reimburseExpenseClaim = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const expenseClaim = await expenseService.reimburseExpenseClaim(id, req.body);
    return successResponse(res, expenseClaim, 'Expense claim reimbursed successfully');
  });

  // ===== REPORTS =====

  /**
   * Get expense report
   * @route GET /api/v1/expenses/report
   */
  getExpenseReport = asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      companyId: req.query.companyId,
      departmentId: req.query.departmentId,
      employeeId: req.query.employeeId,
      categoryId: req.query.categoryId,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      groupBy: req.query.groupBy,
    };

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const report = await expenseService.getExpenseReport(filters, requestingUser);
    return successResponse(res, report, 'Expense report generated successfully');
  });

  // ===== BULK OPERATIONS =====

  /**
   * Bulk submit expense claims
   * @route POST /api/v1/expenses/claims/bulk-submit
   */
  bulkSubmitExpenseClaims = asyncHandler(async (req: Request, res: Response) => {
    const { expenseClaimIds } = req.body;
    const result = await expenseService.bulkSubmitExpenseClaims(expenseClaimIds);
    return successResponse(res, result, 'Bulk submit completed');
  });

  /**
   * Bulk approve expense claims
   * @route POST /api/v1/expenses/claims/bulk-approve
   */
  bulkApproveExpenseClaims = asyncHandler(async (req: Request, res: Response) => {
    const { expenseClaimIds, status, remarks } = req.body;

    const result = await expenseService.bulkApproveExpenseClaims(
      expenseClaimIds,
      status,
      remarks,
      req.user!.userId
    );

    return successResponse(res, result, 'Bulk approval completed');
  });

  /**
   * Bulk reimburse expense claims
   * @route POST /api/v1/expenses/claims/bulk-reimburse
   */
  bulkReimburseExpenseClaims = asyncHandler(async (req: Request, res: Response) => {
    const { expenseClaimIds, reimbursementDate, paymentMethod } = req.body;

    const result = await expenseService.bulkReimburseExpenseClaims(expenseClaimIds, {
      reimbursementDate,
      paymentMethod,
    });

    return successResponse(res, result, 'Bulk reimbursement completed');
  });
}

export default new ExpenseController();
