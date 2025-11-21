import { z } from 'zod';

// Leave Types
export const getLeaveTypesSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    companyId: z.string().uuid().optional(),
    isActive: z.string().optional(),
  }),
});

export const createLeaveTypeSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Leave type name is required'),
    code: z.string().min(1, 'Leave type code is required'),
    description: z.string().optional(),
    companyId: z.string().uuid('Invalid company ID'),
    daysPerYear: z.number().min(0, 'Days per year must be positive'),
    carryForward: z.boolean().optional(),
    maxCarryForward: z.number().min(0).optional(),
    requiresApproval: z.boolean().optional(),
    isPaid: z.boolean().optional(),
    isActive: z.boolean().optional(),
    color: z.string().optional(),
  }),
});

export const updateLeaveTypeSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid leave type ID'),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    daysPerYear: z.number().min(0).optional(),
    carryForward: z.boolean().optional(),
    maxCarryForward: z.number().min(0).optional(),
    requiresApproval: z.boolean().optional(),
    isPaid: z.boolean().optional(),
    isActive: z.boolean().optional(),
    color: z.string().optional(),
  }),
});

export const deleteLeaveTypeSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid leave type ID'),
  }),
});

// Leave Requests
export const getLeaveRequestsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    employeeId: z.string().uuid().optional(),
    leaveTypeId: z.string().uuid().optional(),
    status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export const getLeaveRequestByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid leave request ID'),
  }),
});

export const createLeaveRequestSchema = z.object({
  body: z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
    leaveTypeId: z.string().uuid('Invalid leave type ID'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    reason: z.string().min(1, 'Reason is required'),
    isHalfDay: z.boolean().optional(),
    halfDayPeriod: z.enum(['first_half', 'second_half']).optional(),
    contactDuringLeave: z.string().optional(),
    attachments: z.array(z.string()).optional(),
  }),
});

export const updateLeaveRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid leave request ID'),
  }),
  body: z.object({
    leaveTypeId: z.string().uuid().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    reason: z.string().optional(),
    isHalfDay: z.boolean().optional(),
    halfDayPeriod: z.enum(['first_half', 'second_half']).optional(),
    contactDuringLeave: z.string().optional(),
  }),
});

export const cancelLeaveRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid leave request ID'),
  }),
  body: z.object({
    cancellationReason: z.string().min(1, 'Cancellation reason is required'),
  }),
});

export const approveLeaveRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid leave request ID'),
  }),
  body: z.object({
    status: z.enum(['approved', 'rejected']),
    remarks: z.string().optional(),
  }),
});

// Leave Balance
export const getLeaveBalanceSchema = z.object({
  params: z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
  }),
  query: z.object({
    year: z.string().optional(),
  }),
});

export const adjustLeaveBalanceSchema = z.object({
  body: z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
    leaveTypeId: z.string().uuid('Invalid leave type ID'),
    year: z.number().int(),
    adjustment: z.number(),
    reason: z.string().min(1, 'Reason is required'),
  }),
});

// Leave Policies
export const getEmployeeLeavePoliciesSchema = z.object({
  params: z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
  }),
});

export const assignLeavePolicySchema = z.object({
  body: z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
    leaveTypeId: z.string().uuid('Invalid leave type ID'),
    year: z.number().int(),
    allocatedDays: z.number().min(0),
  }),
});

// Leave Calendar
export const getLeaveCalendarSchema = z.object({
  query: z.object({
    companyId: z.string().uuid().optional(),
    departmentId: z.string().uuid().optional(),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
  }),
});

// Leave Reports
export const getLeaveReportSchema = z.object({
  query: z.object({
    companyId: z.string().uuid().optional(),
    departmentId: z.string().uuid().optional(),
    employeeId: z.string().uuid().optional(),
    leaveTypeId: z.string().uuid().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    groupBy: z.enum(['employee', 'leaveType', 'department', 'month']).optional(),
  }),
});

// Bulk operations
export const bulkApproveLeaveRequestsSchema = z.object({
  body: z.object({
    leaveRequestIds: z.array(z.string().uuid()),
    status: z.enum(['approved', 'rejected']),
    remarks: z.string().optional(),
  }),
});
