import { Request, Response } from 'express';
import attendanceService from '@services/attendance.service';
import { successResponse, createdResponse, paginatedResponse } from '@utils/response';
import { asyncHandler } from '@middleware/error.middleware';

class AttendanceController {
  /**
   * Get attendance records
   * @route GET /api/v1/attendance
   */
  getAttendanceRecords = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const filters = {
      employeeId: req.query.employeeId,
      companyId: req.query.companyId,
      departmentId: req.query.departmentId,
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

    const result = await attendanceService.getAttendanceRecords(
      filters,
      page,
      limit,
      requestingUser
    );

    return paginatedResponse(
      res,
      result.records,
      page,
      limit,
      result.total,
      'Attendance records retrieved successfully'
    );
  });

  /**
   * Get attendance by ID
   * @route GET /api/v1/attendance/:id
   */
  getAttendanceById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const attendance = await attendanceService.getAttendanceById(id);
    return successResponse(res, attendance, 'Attendance record retrieved successfully');
  });

  /**
   * Clock in
   * @route POST /api/v1/attendance/clock-in
   */
  clockIn = asyncHandler(async (req: Request, res: Response) => {
    const attendance = await attendanceService.clockIn({
      ...req.body,
      clockInTime: req.body.clockInTime ? new Date(req.body.clockInTime) : undefined,
    });
    return createdResponse(res, attendance, 'Clocked in successfully');
  });

  /**
   * Clock out
   * @route POST /api/v1/attendance/clock-out
   */
  clockOut = asyncHandler(async (req: Request, res: Response) => {
    const attendance = await attendanceService.clockOut({
      ...req.body,
      clockOutTime: req.body.clockOutTime ? new Date(req.body.clockOutTime) : undefined,
    });
    return successResponse(res, attendance, 'Clocked out successfully');
  });

  /**
   * Create manual attendance
   * @route POST /api/v1/attendance
   */
  createAttendance = asyncHandler(async (req: Request, res: Response) => {
    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const attendance = await attendanceService.createAttendance(req.body, requestingUser);
    return createdResponse(res, attendance, 'Attendance record created successfully');
  });

  /**
   * Update attendance
   * @route PUT /api/v1/attendance/:id
   */
  updateAttendance = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const attendance = await attendanceService.updateAttendance(id, req.body, requestingUser);
    return successResponse(res, attendance, 'Attendance record updated successfully');
  });

  /**
   * Delete attendance
   * @route DELETE /api/v1/attendance/:id
   */
  deleteAttendance = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const result = await attendanceService.deleteAttendance(id, requestingUser);
    return successResponse(res, result, 'Attendance record deleted successfully');
  });

  /**
   * Get employee attendance summary
   * @route GET /api/v1/attendance/employee/:employeeId/summary
   */
  getEmployeeSummary = asyncHandler(async (req: Request, res: Response) => {
    const { employeeId } = req.params;

    const filters = {
      month: req.query.month,
      year: req.query.year,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const summary = await attendanceService.getEmployeeAttendanceSummary(employeeId, filters);
    return successResponse(res, summary, 'Attendance summary retrieved successfully');
  });

  /**
   * Get today's attendance
   * @route GET /api/v1/attendance/today
   */
  getTodayAttendance = asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      companyId: req.query.companyId,
      departmentId: req.query.departmentId,
      status: req.query.status,
    };

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const records = await attendanceService.getTodayAttendance(filters, requestingUser);
    return successResponse(res, records, "Today's attendance retrieved successfully");
  });

  /**
   * Get attendance statistics
   * @route GET /api/v1/attendance/statistics
   */
  getStatistics = asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      companyId: req.query.companyId,
      departmentId: req.query.departmentId,
      employeeId: req.query.employeeId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const statistics = await attendanceService.getAttendanceStatistics(filters, requestingUser);
    return successResponse(res, statistics, 'Statistics retrieved successfully');
  });

  /**
   * Mark bulk attendance
   * @route POST /api/v1/attendance/bulk
   */
  markBulkAttendance = asyncHandler(async (req: Request, res: Response) => {
    const { attendances } = req.body;

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const result = await attendanceService.markBulkAttendance(attendances, requestingUser);
    return successResponse(res, result, 'Bulk attendance marked successfully');
  });

  /**
   * Request regularization
   * @route POST /api/v1/attendance/regularize
   */
  requestRegularization = asyncHandler(async (req: Request, res: Response) => {
    const regularization = await attendanceService.requestRegularization(req.body);
    return createdResponse(res, regularization, 'Regularization request submitted successfully');
  });

  /**
   * Get regularization requests
   * @route GET /api/v1/attendance/regularization-requests
   */
  getRegularizationRequests = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const filters = {
      employeeId: req.query.employeeId,
      status: req.query.status,
    };

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const result = await attendanceService.getRegularizationRequests(
      filters,
      page,
      limit,
      requestingUser
    );

    return paginatedResponse(
      res,
      result.requests,
      page,
      limit,
      result.total,
      'Regularization requests retrieved successfully'
    );
  });

  /**
   * Approve/Reject regularization
   * @route PATCH /api/v1/attendance/regularization/:id
   */
  approveRegularization = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const regularization = await attendanceService.approveRegularization(id, status, remarks);
    return successResponse(res, regularization, `Regularization ${status} successfully`);
  });
}

export default new AttendanceController();
