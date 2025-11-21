import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware';
import attendanceController from '@controllers/attendance.controller';
import { validate } from '@middleware/validation.middleware';
import {
  getAttendanceRecordsSchema,
  getAttendanceByIdSchema,
  clockInSchema,
  clockOutSchema,
  createAttendanceSchema,
  updateAttendanceSchema,
  deleteAttendanceSchema,
  getEmployeeAttendanceSummarySchema,
  getTodayAttendanceSchema,
  getAttendanceStatisticsSchema,
  markBulkAttendanceSchema,
  regularizeAttendanceSchema,
  getRegularizationRequestsSchema,
  approveRegularizationSchema,
} from '@validators/attendance.validator';

const router = Router();

router.use(authenticate);

// Clock in/out
router.post(
  '/clock-in',
  validate(clockInSchema),
  attendanceController.clockIn
);

router.post(
  '/clock-out',
  validate(clockOutSchema),
  attendanceController.clockOut
);

// Today's attendance
router.get(
  '/today',
  authorize(['admin', 'hr', 'manager']),
  validate(getTodayAttendanceSchema),
  attendanceController.getTodayAttendance
);

// Statistics
router.get(
  '/statistics',
  authorize(['admin', 'hr', 'manager']),
  validate(getAttendanceStatisticsSchema),
  attendanceController.getStatistics
);

// Employee summary
router.get(
  '/employee/:employeeId/summary',
  validate(getEmployeeAttendanceSummarySchema),
  attendanceController.getEmployeeSummary
);

// Regularization
router.post(
  '/regularize',
  validate(regularizeAttendanceSchema),
  attendanceController.requestRegularization
);

router.get(
  '/regularization-requests',
  authorize(['admin', 'hr', 'manager']),
  validate(getRegularizationRequestsSchema),
  attendanceController.getRegularizationRequests
);

router.patch(
  '/regularization/:id',
  authorize(['admin', 'hr', 'manager']),
  validate(approveRegularizationSchema),
  attendanceController.approveRegularization
);

// Bulk operations
router.post(
  '/bulk',
  authorize(['admin', 'hr']),
  validate(markBulkAttendanceSchema),
  attendanceController.markBulkAttendance
);

// Attendance CRUD
router.get(
  '/',
  authorize(['admin', 'hr', 'manager']),
  validate(getAttendanceRecordsSchema),
  attendanceController.getAttendanceRecords
);

router.get(
  '/:id',
  validate(getAttendanceByIdSchema),
  attendanceController.getAttendanceById
);

router.post(
  '/',
  authorize(['admin', 'hr']),
  validate(createAttendanceSchema),
  attendanceController.createAttendance
);

router.put(
  '/:id',
  authorize(['admin', 'hr']),
  validate(updateAttendanceSchema),
  attendanceController.updateAttendance
);

router.delete(
  '/:id',
  authorize(['admin', 'hr']),
  validate(deleteAttendanceSchema),
  attendanceController.deleteAttendance
);

export default router;