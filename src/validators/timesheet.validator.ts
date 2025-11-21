import { z } from 'zod';

// Get timesheets
export const getTimesheetsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    employeeId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
    taskId: z.string().uuid().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    status: z.enum(['draft', 'submitted', 'approved', 'rejected']).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

// Get timesheet by ID
export const getTimesheetByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid timesheet ID'),
  }),
});

// Create timesheet
export const createTimesheetSchema = z.object({
  body: z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
    projectId: z.string().uuid('Invalid project ID').optional(),
    taskId: z.string().uuid('Invalid task ID').optional(),
    date: z.string().min(1, 'Date is required'),
    hours: z.number().min(0, 'Hours must be positive'),
    description: z.string().min(1, 'Description is required'),
    billable: z.boolean().optional(),
    status: z.enum(['draft', 'submitted']).optional(),
  }),
});

// Update timesheet
export const updateTimesheetSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid timesheet ID'),
  }),
  body: z.object({
    projectId: z.string().uuid().optional(),
    taskId: z.string().uuid().optional(),
    date: z.string().optional(),
    hours: z.number().min(0).optional(),
    description: z.string().optional(),
    billable: z.boolean().optional(),
    status: z.enum(['draft', 'submitted']).optional(),
  }),
});

// Delete timesheet
export const deleteTimesheetSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid timesheet ID'),
  }),
});

// Submit timesheet
export const submitTimesheetSchema = z.object({
  body: z.object({
    timesheetIds: z.array(z.string().uuid()),
  }),
});

// Approve/Reject timesheet
export const approveTimesheetSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid timesheet ID'),
  }),
  body: z.object({
    status: z.enum(['approved', 'rejected']),
    remarks: z.string().optional(),
  }),
});

// Get employee timesheet summary
export const getEmployeeTimesheetSummarySchema = z.object({
  params: z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
  }),
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    projectId: z.string().uuid().optional(),
  }),
});

// Bulk create timesheets
export const bulkCreateTimesheetsSchema = z.object({
  body: z.object({
    timesheets: z.array(
      z.object({
        employeeId: z.string().uuid(),
        projectId: z.string().uuid().optional(),
        taskId: z.string().uuid().optional(),
        date: z.string(),
        hours: z.number().min(0),
        description: z.string(),
        billable: z.boolean().optional(),
      })
    ),
  }),
});

// Get pending approvals
export const getPendingApprovalsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    employeeId: z.string().uuid().optional(),
  }),
});

// Get timesheet report
export const getTimesheetReportSchema = z.object({
  query: z.object({
    employeeId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
    departmentId: z.string().uuid().optional(),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    groupBy: z.enum(['employee', 'project', 'task', 'date']).optional(),
  }),
});
