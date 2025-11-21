import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware';
import leaveController from '@controllers/leave.controller';
import { validate } from '@middleware/validation.middleware';
import {
  getLeaveTypesSchema,
  createLeaveTypeSchema,
  updateLeaveTypeSchema,
  deleteLeaveTypeSchema,
  getLeaveRequestsSchema,
  getLeaveRequestByIdSchema,
  createLeaveRequestSchema,
  updateLeaveRequestSchema,
  cancelLeaveRequestSchema,
  approveLeaveRequestSchema,
  getLeaveBalanceSchema,
  adjustLeaveBalanceSchema,
  getLeaveCalendarSchema,
  getLeaveReportSchema,
  bulkApproveLeaveRequestsSchema,
} from '@validators/leave.validator';

const router = Router();

router.use(authenticate);

// Leave Types
router.get(
  '/types',
  authorize(['admin', 'hr']),
  validate(getLeaveTypesSchema),
  leaveController.getLeaveTypes
);

router.post(
  '/types',
  authorize(['admin', 'hr']),
  validate(createLeaveTypeSchema),
  leaveController.createLeaveType
);

router.put(
  '/types/:id',
  authorize(['admin', 'hr']),
  validate(updateLeaveTypeSchema),
  leaveController.updateLeaveType
);

router.delete(
  '/types/:id',
  authorize(['admin', 'hr']),
  validate(deleteLeaveTypeSchema),
  leaveController.deleteLeaveType
);

// Leave Requests - Bulk operations first
router.post(
  '/requests/bulk-approve',
  authorize(['admin', 'hr', 'manager']),
  validate(bulkApproveLeaveRequestsSchema),
  leaveController.bulkApproveLeaveRequests
);

// Leave Requests - CRUD
router.get(
  '/requests',
  validate(getLeaveRequestsSchema),
  leaveController.getLeaveRequests
);

router.get(
  '/requests/:id',
  validate(getLeaveRequestByIdSchema),
  leaveController.getLeaveRequestById
);

router.post(
  '/requests',
  validate(createLeaveRequestSchema),
  leaveController.createLeaveRequest
);

router.put(
  '/requests/:id',
  validate(updateLeaveRequestSchema),
  leaveController.updateLeaveRequest
);

router.patch(
  '/requests/:id/cancel',
  validate(cancelLeaveRequestSchema),
  leaveController.cancelLeaveRequest
);

router.patch(
  '/requests/:id/approve',
  authorize(['admin', 'hr', 'manager']),
  validate(approveLeaveRequestSchema),
  leaveController.approveLeaveRequest
);

// Leave Balance
router.get(
  '/balance/:employeeId',
  validate(getLeaveBalanceSchema),
  leaveController.getLeaveBalance
);

router.post(
  '/balance/adjust',
  authorize(['admin', 'hr']),
  validate(adjustLeaveBalanceSchema),
  leaveController.adjustLeaveBalance
);

// Leave Calendar
router.get(
  '/calendar',
  validate(getLeaveCalendarSchema),
  leaveController.getLeaveCalendar
);

// Leave Report
router.get(
  '/report',
  authorize(['admin', 'hr', 'manager']),
  validate(getLeaveReportSchema),
  leaveController.getLeaveReport
);

export default router;