import { Request, Response } from 'express';
import timesheetService from '@services/timesheet.service';
import { successResponse, createdResponse, paginatedResponse } from '@utils/response';
import { asyncHandler } from '@middleware/error.middleware';

class TimesheetController {
  /**
   * Get timesheets
   * @route GET /api/v1/timesheets
   */
  getTimesheets = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const filters = {
      employeeId: req.query.employeeId,
      projectId: req.query.projectId,
      taskId: req.query.taskId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      status: req.query.status,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    };

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const result = await timesheetService.getTimesheets(filters, page, limit, requestingUser);

    return paginatedResponse(
      res,
      result.timesheets,
      page,
      limit,
      result.total,
      'Timesheets retrieved successfully'
    );
  });

  /**
   * Get timesheet by ID
   * @route GET /api/v1/timesheets/:id
   */
  getTimesheetById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const timesheet = await timesheetService.getTimesheetById(id);
    return successResponse(res, timesheet, 'Timesheet retrieved successfully');
  });

  /**
   * Create timesheet
   * @route POST /api/v1/timesheets
   */
  createTimesheet = asyncHandler(async (req: Request, res: Response) => {
    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
      userId: req.user!.userId,
    };

    const timesheetData = {
      ...req.body,
      date: new Date(req.body.date),
    };

    const timesheet = await timesheetService.createTimesheet(timesheetData, requestingUser);
    return createdResponse(res, timesheet, 'Timesheet created successfully');
  });

  /**
   * Update timesheet
   * @route PUT /api/v1/timesheets/:id
   */
  updateTimesheet = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
      userId: req.user!.userId,
    };

    const updateData = {
      ...req.body,
      date: req.body.date ? new Date(req.body.date) : undefined,
    };

    const timesheet = await timesheetService.updateTimesheet(id, updateData, requestingUser);
    return successResponse(res, timesheet, 'Timesheet updated successfully');
  });

  /**
   * Delete timesheet
   * @route DELETE /api/v1/timesheets/:id
   */
  deleteTimesheet = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const result = await timesheetService.deleteTimesheet(id, requestingUser);
    return successResponse(res, result, 'Timesheet deleted successfully');
  });

  /**
   * Submit timesheets
   * @route POST /api/v1/timesheets/submit
   */
  submitTimesheets = asyncHandler(async (req: Request, res: Response) => {
    const { timesheetIds } = req.body;

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const result = await timesheetService.submitTimesheets(timesheetIds, requestingUser);
    return successResponse(res, result, 'Timesheets submitted successfully');
  });

  /**
   * Approve/Reject timesheet
   * @route PATCH /api/v1/timesheets/:id/approve
   */
  approveTimesheet = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const timesheet = await timesheetService.approveTimesheet(
      id,
      status,
      remarks,
      req.user!.userId
    );

    return successResponse(res, timesheet, `Timesheet ${status} successfully`);
  });

  /**
   * Get employee timesheet summary
   * @route GET /api/v1/timesheets/employee/:employeeId/summary
   */
  getEmployeeSummary = asyncHandler(async (req: Request, res: Response) => {
    const { employeeId } = req.params;

    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      projectId: req.query.projectId,
    };

    const summary = await timesheetService.getEmployeeTimesheetSummary(employeeId, filters);
    return successResponse(res, summary, 'Timesheet summary retrieved successfully');
  });

  /**
   * Get pending approvals
   * @route GET /api/v1/timesheets/pending-approvals
   */
  getPendingApprovals = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const filters = {
      employeeId: req.query.employeeId,
    };

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const result = await timesheetService.getPendingApprovals(
      filters,
      page,
      limit,
      requestingUser
    );

    return paginatedResponse(
      res,
      result.timesheets,
      page,
      limit,
      result.total,
      'Pending approvals retrieved successfully'
    );
  });

  /**
   * Bulk create timesheets
   * @route POST /api/v1/timesheets/bulk
   */
  bulkCreateTimesheets = asyncHandler(async (req: Request, res: Response) => {
    const { timesheets } = req.body;

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
      userId: req.user!.userId,
    };

    const result = await timesheetService.bulkCreateTimesheets(timesheets, requestingUser);
    return successResponse(res, result, 'Bulk timesheet creation completed');
  });

  /**
   * Get timesheet report
   * @route GET /api/v1/timesheets/report
   */
  getTimesheetReport = asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      employeeId: req.query.employeeId,
      projectId: req.query.projectId,
      departmentId: req.query.departmentId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      groupBy: req.query.groupBy,
    };

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const report = await timesheetService.getTimesheetReport(filters, requestingUser);
    return successResponse(res, report, 'Timesheet report generated successfully');
  });
}

export default new TimesheetController();
