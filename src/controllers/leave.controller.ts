import { Request, Response } from 'express';
import leaveService from '@services/leave.service';
import { successResponse, createdResponse, paginatedResponse } from '@utils/response';
import { asyncHandler } from '@middleware/error.middleware';

class LeaveController {
  // ===== LEAVE TYPES =====

  /**
   * Get leave types
   * @route GET /api/v1/leave/types
   */
  getLeaveTypes = asyncHandler(async (req: Request, res: Response) => {
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

    const result = await leaveService.getLeaveTypes(filters, page, limit, requestingUser);

    return paginatedResponse(
      res,
      result.leaveTypes,
      page,
      limit,
      result.total,
      'Leave types retrieved successfully'
    );
  });

  /**
   * Create leave type
   * @route POST /api/v1/leave/types
   */
  createLeaveType = asyncHandler(async (req: Request, res: Response) => {
    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const leaveType = await leaveService.createLeaveType(req.body, requestingUser);
    return createdResponse(res, leaveType, 'Leave type created successfully');
  });

  /**
   * Update leave type
   * @route PUT /api/v1/leave/types/:id
   */
  updateLeaveType = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const leaveType = await leaveService.updateLeaveType(id, req.body);
    return successResponse(res, leaveType, 'Leave type updated successfully');
  });

  /**
   * Delete leave type
   * @route DELETE /api/v1/leave/types/:id
   */
  deleteLeaveType = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await leaveService.deleteLeaveType(id);
    return successResponse(res, result, 'Leave type deleted successfully');
  });

  // ===== LEAVE REQUESTS =====

  /**
   * Get leave requests
   * @route GET /api/v1/leave/requests
   */
  getLeaveRequests = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const filters = {
      employeeId: req.query.employeeId,
      leaveTypeId: req.query.leaveTypeId,
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

    const result = await leaveService.getLeaveRequests(filters, page, limit, requestingUser);

    return paginatedResponse(
      res,
      result.leaveRequests,
      page,
      limit,
      result.total,
      'Leave requests retrieved successfully'
    );
  });

  /**
   * Get leave request by ID
   * @route GET /api/v1/leave/requests/:id
   */
  getLeaveRequestById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const leaveRequest = await leaveService.getLeaveRequestById(id);
    return successResponse(res, leaveRequest, 'Leave request retrieved successfully');
  });

  /**
   * Create leave request
   * @route POST /api/v1/leave/requests
   */
  createLeaveRequest = asyncHandler(async (req: Request, res: Response) => {
    const leaveRequest = await leaveService.createLeaveRequest(req.body);
    return createdResponse(res, leaveRequest, 'Leave request created successfully');
  });

  /**
   * Update leave request
   * @route PUT /api/v1/leave/requests/:id
   */
  updateLeaveRequest = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const leaveRequest = await leaveService.updateLeaveRequest(id, req.body);
    return successResponse(res, leaveRequest, 'Leave request updated successfully');
  });

  /**
   * Cancel leave request
   * @route PATCH /api/v1/leave/requests/:id/cancel
   */
  cancelLeaveRequest = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { cancellationReason } = req.body;
    const leaveRequest = await leaveService.cancelLeaveRequest(id, cancellationReason);
    return successResponse(res, leaveRequest, 'Leave request cancelled successfully');
  });

  /**
   * Approve/Reject leave request
   * @route PATCH /api/v1/leave/requests/:id/approve
   */
  approveLeaveRequest = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const leaveRequest = await leaveService.approveLeaveRequest(
      id,
      status,
      remarks,
      req.user!.userId
    );

    return successResponse(res, leaveRequest, `Leave request ${status} successfully`);
  });

  // ===== LEAVE BALANCE =====

  /**
   * Get leave balance
   * @route GET /api/v1/leave/balance/:employeeId
   */
  getLeaveBalance = asyncHandler(async (req: Request, res: Response) => {
    const { employeeId } = req.params;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;

    const balances = await leaveService.getLeaveBalances(employeeId, year);
    return successResponse(res, balances, 'Leave balances retrieved successfully');
  });

  /**
   * Adjust leave balance
   * @route POST /api/v1/leave/balance/adjust
   */
  adjustLeaveBalance = asyncHandler(async (req: Request, res: Response) => {
    const data = {
      ...req.body,
      adjustedBy: req.user!.userId,
    };

    const balance = await leaveService.adjustLeaveBalance(data);
    return successResponse(res, balance, 'Leave balance adjusted successfully');
  });

  // ===== LEAVE CALENDAR =====

  /**
   * Get leave calendar
   * @route GET /api/v1/leave/calendar
   */
  getLeaveCalendar = asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      companyId: req.query.companyId,
      departmentId: req.query.departmentId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const leaves = await leaveService.getLeaveCalendar(filters, requestingUser);
    return successResponse(res, leaves, 'Leave calendar retrieved successfully');
  });

  // ===== REPORTS =====

  /**
   * Get leave report
   * @route GET /api/v1/leave/report
   */
  getLeaveReport = asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      companyId: req.query.companyId,
      departmentId: req.query.departmentId,
      employeeId: req.query.employeeId,
      leaveTypeId: req.query.leaveTypeId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      groupBy: req.query.groupBy,
    };

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const report = await leaveService.getLeaveReport(filters, requestingUser);
    return successResponse(res, report, 'Leave report generated successfully');
  });

  /**
   * Bulk approve leave requests
   * @route POST /api/v1/leave/requests/bulk-approve
   */
  bulkApproveLeaveRequests = asyncHandler(async (req: Request, res: Response) => {
    const { leaveRequestIds, status, remarks } = req.body;

    const result = await leaveService.bulkApproveLeaveRequests(
      leaveRequestIds,
      status,
      remarks,
      req.user!.userId
    );

    return successResponse(res, result, 'Bulk approval completed');
  });
}

export default new LeaveController();
