import { z } from 'zod';

// Get attendance records
export const getAttendanceRecordsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    employeeId: z.string().uuid().optional(),
    companyId: z.string().uuid().optional(),
    departmentId: z.string().uuid().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    status: z.enum(['present', 'absent', 'half_day', 'late', 'on_leave', 'holiday']).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

// Get attendance by ID
export const getAttendanceByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid attendance ID'),
  }),
});

// Clock in
export const clockInSchema = z.object({
  body: z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
    clockInTime: z.string().datetime().optional(),
    location: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    deviceInfo: z.string().optional(),
    remarks: z.string().optional(),
  }),
});

// Clock out
export const clockOutSchema = z.object({
  body: z.object({
    attendanceId: z.string().uuid('Invalid attendance ID'),
    clockOutTime: z.string().datetime().optional(),
    location: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    remarks: z.string().optional(),
  }),
});

// Manual attendance entry
export const createAttendanceSchema = z.object({
  body: z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
    date: z.string().min(1, 'Date is required'),
    clockInTime: z.string().datetime(),
    clockOutTime: z.string().datetime().optional(),
    status: z.enum(['present', 'absent', 'half_day', 'late', 'on_leave', 'holiday']),
    workHours: z.number().optional(),
    overtimeHours: z.number().optional(),
    remarks: z.string().optional(),
    isManualEntry: z.boolean().optional(),
  }),
});

// Update attendance
export const updateAttendanceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid attendance ID'),
  }),
  body: z.object({
    clockInTime: z.string().datetime().optional(),
    clockOutTime: z.string().datetime().optional(),
    status: z.enum(['present', 'absent', 'half_day', 'late', 'on_leave', 'holiday']).optional(),
    workHours: z.number().optional(),
    overtimeHours: z.number().optional(),
    remarks: z.string().optional(),
  }),
});

// Delete attendance
export const deleteAttendanceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid attendance ID'),
  }),
});

// Approve/Reject attendance
export const approveAttendanceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid attendance ID'),
  }),
  body: z.object({
    status: z.enum(['approved', 'rejected']),
    remarks: z.string().optional(),
  }),
});

// Get employee attendance summary
export const getEmployeeAttendanceSummarySchema = z.object({
  params: z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
  }),
  query: z.object({
    month: z.string().optional(),
    year: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

// Get attendance report
export const getAttendanceReportSchema = z.object({
  query: z.object({
    companyId: z.string().uuid().optional(),
    departmentId: z.string().uuid().optional(),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    format: z.enum(['json', 'csv']).optional(),
  }),
});

// Mark bulk attendance
export const markBulkAttendanceSchema = z.object({
  body: z.object({
    attendances: z.array(
      z.object({
        employeeId: z.string().uuid(),
        date: z.string(),
        status: z.enum(['present', 'absent', 'half_day', 'late', 'on_leave', 'holiday']),
        clockInTime: z.string().datetime().optional(),
        clockOutTime: z.string().datetime().optional(),
        remarks: z.string().optional(),
      })
    ),
  }),
});

// Get today's attendance
export const getTodayAttendanceSchema = z.object({
  query: z.object({
    companyId: z.string().uuid().optional(),
    departmentId: z.string().uuid().optional(),
    status: z.enum(['present', 'absent', 'half_day', 'late', 'on_leave', 'holiday']).optional(),
  }),
});

// Get attendance statistics
export const getAttendanceStatisticsSchema = z.object({
  query: z.object({
    companyId: z.string().uuid().optional(),
    departmentId: z.string().uuid().optional(),
    employeeId: z.string().uuid().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

// Regularize attendance
export const regularizeAttendanceSchema = z.object({
  body: z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
    date: z.string().min(1, 'Date is required'),
    clockInTime: z.string().datetime(),
    clockOutTime: z.string().datetime(),
    reason: z.string().min(1, 'Reason is required'),
  }),
});

// Get attendance regularization requests
export const getRegularizationRequestsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    employeeId: z.string().uuid().optional(),
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
  }),
});

// Approve/Reject regularization
export const approveRegularizationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid regularization ID'),
  }),
  body: z.object({
    status: z.enum(['approved', 'rejected']),
    remarks: z.string().optional(),
  }),
});
