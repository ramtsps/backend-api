import { Request, Response } from 'express';
import payrollService from '@services/payroll.service';
import { successResponse, createdResponse, paginatedResponse } from '@utils/response';
import { asyncHandler } from '@middleware/error.middleware';

class PayrollController {
  // ===== SALARY COMPONENTS =====

  /**
   * Get salary components
   * @route GET /api/v1/payroll/components
   */
  getSalaryComponents = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const filters = {
      companyId: req.query.companyId,
      type: req.query.type,
      isActive: req.query.isActive,
    };

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const result = await payrollService.getSalaryComponents(filters, page, limit, requestingUser);

    return paginatedResponse(
      res,
      result.components,
      page,
      limit,
      result.total,
      'Salary components retrieved successfully'
    );
  });

  /**
   * Create salary component
   * @route POST /api/v1/payroll/components
   */
  createSalaryComponent = asyncHandler(async (req: Request, res: Response) => {
    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const component = await payrollService.createSalaryComponent(req.body, requestingUser);
    return createdResponse(res, component, 'Salary component created successfully');
  });

  /**
   * Update salary component
   * @route PUT /api/v1/payroll/components/:id
   */
  updateSalaryComponent = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const component = await payrollService.updateSalaryComponent(id, req.body);
    return successResponse(res, component, 'Salary component updated successfully');
  });

  /**
   * Delete salary component
   * @route DELETE /api/v1/payroll/components/:id
   */
  deleteSalaryComponent = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await payrollService.deleteSalaryComponent(id);
    return successResponse(res, result, 'Salary component deleted successfully');
  });

  // ===== EMPLOYEE SALARY STRUCTURE =====

  /**
   * Get employee salary structure
   * @route GET /api/v1/payroll/salary-structure/:employeeId
   */
  getEmployeeSalaryStructure = asyncHandler(async (req: Request, res: Response) => {
    const { employeeId } = req.params;
    const structure = await payrollService.getEmployeeSalaryStructure(employeeId);
    return successResponse(res, structure, 'Salary structure retrieved successfully');
  });

  /**
   * Create employee salary structure
   * @route POST /api/v1/payroll/salary-structure
   */
  createEmployeeSalaryStructure = asyncHandler(async (req: Request, res: Response) => {
    const structure = await payrollService.createEmployeeSalaryStructure(req.body);
    return createdResponse(res, structure, 'Salary structure created successfully');
  });

  /**
   * Update employee salary structure
   * @route PUT /api/v1/payroll/salary-structure/:id
   */
  updateEmployeeSalaryStructure = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const structure = await payrollService.updateEmployeeSalaryStructure(id, req.body);
    return successResponse(res, structure, 'Salary structure updated successfully');
  });

  // ===== PAYROLL PROCESSING =====

  /**
   * Get payrolls
   * @route GET /api/v1/payroll
   */
  getPayrolls = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const filters = {
      companyId: req.query.companyId,
      employeeId: req.query.employeeId,
      month: req.query.month,
      year: req.query.year,
      status: req.query.status,
    };

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const result = await payrollService.getPayrolls(filters, page, limit, requestingUser);

    return paginatedResponse(
      res,
      result.payrolls,
      page,
      limit,
      result.total,
      'Payrolls retrieved successfully'
    );
  });

  /**
   * Get payroll by ID
   * @route GET /api/v1/payroll/:id
   */
  getPayrollById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const payroll = await payrollService.getPayrollById(id);
    return successResponse(res, payroll, 'Payroll retrieved successfully');
  });

  /**
   * Generate payroll
   * @route POST /api/v1/payroll/generate
   */
  generatePayroll = asyncHandler(async (req: Request, res: Response) => {
    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const result = await payrollService.generatePayroll(req.body, requestingUser);
    return successResponse(res, result, 'Payroll generated successfully');
  });

  /**
   * Process payroll
   * @route POST /api/v1/payroll/:id/process
   */
  processPayroll = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const payroll = await payrollService.processPayroll(id);
    return successResponse(res, payroll, 'Payroll processed successfully');
  });

  /**
   * Approve payroll
   * @route POST /api/v1/payroll/:id/approve
   */
  approvePayroll = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { remarks } = req.body;

    const payroll = await payrollService.approvePayroll(id, remarks, req.user!.userId);
    return successResponse(res, payroll, 'Payroll approved successfully');
  });

  /**
   * Mark payroll as paid
   * @route POST /api/v1/payroll/:id/mark-paid
   */
  markPayrollPaid = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const payroll = await payrollService.markPayrollPaid(id, req.body);
    return successResponse(res, payroll, 'Payroll marked as paid successfully');
  });

  // ===== PAYSLIPS =====

  /**
   * Get payslips
   * @route GET /api/v1/payroll/payslips
   */
  getPayslips = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const filters = {
      employeeId: req.query.employeeId,
      month: req.query.month,
      year: req.query.year,
    };

    const result = await payrollService.getPayslips(filters, page, limit);

    return paginatedResponse(
      res,
      result.payslips,
      page,
      limit,
      result.total,
      'Payslips retrieved successfully'
    );
  });

  /**
   * Get payslip by ID
   * @route GET /api/v1/payroll/payslips/:id
   */
  getPayslipById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const payslip = await payrollService.getPayrollById(id);
    return successResponse(res, payslip, 'Payslip retrieved successfully');
  });

  // ===== ADJUSTMENTS =====

  /**
   * Create payroll adjustment
   * @route POST /api/v1/payroll/adjustments
   */
  createPayrollAdjustment = asyncHandler(async (req: Request, res: Response) => {
    const adjustment = await payrollService.createPayrollAdjustment(req.body);
    return createdResponse(res, adjustment, 'Payroll adjustment created successfully');
  });

  /**
   * Get payroll adjustments
   * @route GET /api/v1/payroll/adjustments
   */
  getPayrollAdjustments = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const filters = {
      employeeId: req.query.employeeId,
      month: req.query.month,
      year: req.query.year,
      type: req.query.type,
    };

    const result = await payrollService.getPayrollAdjustments(filters, page, limit);

    return paginatedResponse(
      res,
      result.adjustments,
      page,
      limit,
      result.total,
      'Payroll adjustments retrieved successfully'
    );
  });

  /**
   * Delete payroll adjustment
   * @route DELETE /api/v1/payroll/adjustments/:id
   */
  deletePayrollAdjustment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await payrollService.deletePayrollAdjustment(id);
    return successResponse(res, result, 'Payroll adjustment deleted successfully');
  });

  // ===== REPORTS =====

  /**
   * Get payroll report
   * @route GET /api/v1/payroll/report
   */
  getPayrollReport = asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      companyId: req.query.companyId,
      departmentId: req.query.departmentId,
      month: req.query.month,
      year: req.query.year,
      groupBy: req.query.groupBy,
    };

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const report = await payrollService.getPayrollReport(filters, requestingUser);
    return successResponse(res, report, 'Payroll report generated successfully');
  });

  /**
   * Bulk approve payrolls
   * @route POST /api/v1/payroll/bulk-approve
   */
  bulkApprovePayrolls = asyncHandler(async (req: Request, res: Response) => {
    const { payrollIds, remarks } = req.body;

    const result = await payrollService.bulkApprovePayrolls(
      payrollIds,
      remarks,
      req.user!.userId
    );

    return successResponse(res, result, 'Bulk payroll approval completed');
  });

  /**
   * Bulk mark payrolls as paid
   * @route POST /api/v1/payroll/bulk-mark-paid
   */
  bulkMarkPayrollsPaid = asyncHandler(async (req: Request, res: Response) => {
    const { payrollIds, paymentDate, paymentMethod } = req.body;

    const result = await payrollService.bulkMarkPayrollsPaid(payrollIds, {
      paymentDate,
      paymentMethod,
    });

    return successResponse(res, result, 'Bulk payroll payment marking completed');
  });
}

export default new PayrollController();
