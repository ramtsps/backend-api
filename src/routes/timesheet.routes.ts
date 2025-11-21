import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware';
import timesheetController from '@controllers/timesheet.controller';
import { validate } from '@middleware/validation.middleware';
import {
  getTimesheetsSchema,
  getTimesheetByIdSchema,
  createTimesheetSchema,
  updateTimesheetSchema,
  deleteTimesheetSchema,
  submitTimesheetSchema,
  approveTimesheetSchema,
  getEmployeeTimesheetSummarySchema,
  bulkCreateTimesheetsSchema,
  getPendingApprovalsSchema,
  getTimesheetReportSchema,
} from '@validators/timesheet.validator';

const router = Router();

router.use(authenticate);

// Submit timesheets
router.post(
  '/submit',
  validate(submitTimesheetSchema),
  timesheetController.submitTimesheets
);

// Pending approvals
router.get(
  '/pending-approvals',
  authorize(['admin', 'hr', 'manager']),
  validate(getPendingApprovalsSchema),
  timesheetController.getPendingApprovals
);

// Employee summary
router.get(
  '/employee/:employeeId/summary',
  validate(getEmployeeTimesheetSummarySchema),
  timesheetController.getEmployeeSummary
);

// Report
router.get(
  '/report',
  authorize(['admin', 'hr', 'manager']),
  validate(getTimesheetReportSchema),
  timesheetController.getTimesheetReport
);

// Bulk operations
router.post(
  '/bulk',
  validate(bulkCreateTimesheetsSchema),
  timesheetController.bulkCreateTimesheets
);

// Timesheet CRUD
router.get(
  '/',
  validate(getTimesheetsSchema),
  timesheetController.getTimesheets
);

router.get(
  '/:id',
  validate(getTimesheetByIdSchema),
  timesheetController.getTimesheetById
);

router.post(
  '/',
  validate(createTimesheetSchema),
  timesheetController.createTimesheet
);

router.put(
  '/:id',
  validate(updateTimesheetSchema),
  timesheetController.updateTimesheet
);

router.delete(
  '/:id',
  validate(deleteTimesheetSchema),
  timesheetController.deleteTimesheet
);

// Approve/Reject
router.patch(
  '/:id/approve',
  authorize(['admin', 'hr', 'manager']),
  validate(approveTimesheetSchema),
  timesheetController.approveTimesheet
);

export default router;