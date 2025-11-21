import { z } from 'zod';

// Salary Components
export const getSalaryComponentsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    companyId: z.string().uuid().optional(),
    type: z.enum(['earning', 'deduction']).optional(),
    isActive: z.string().optional(),
  }),
});

export const createSalaryComponentSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Component name is required'),
    code: z.string().min(1, 'Component code is required'),
    companyId: z.string().uuid('Invalid company ID'),
    type: z.enum(['earning', 'deduction']),
    calculationType: z.enum(['fixed', 'percentage', 'formula']),
    value: z.number().optional(),
    formula: z.string().optional(),
    isStatutory: z.boolean().optional(),
    isTaxable: z.boolean().optional(),
    isActive: z.boolean().optional(),
    displayOrder: z.number().optional(),
  }),
});

export const updateSalaryComponentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid component ID'),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    type: z.enum(['earning', 'deduction']).optional(),
    calculationType: z.enum(['fixed', 'percentage', 'formula']).optional(),
    value: z.number().optional(),
    formula: z.string().optional(),
    isStatutory: z.boolean().optional(),
    isTaxable: z.boolean().optional(),
    isActive: z.boolean().optional(),
    displayOrder: z.number().optional(),
  }),
});

export const deleteSalaryComponentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid component ID'),
  }),
});

// Employee Salary Structure
export const getEmployeeSalaryStructureSchema = z.object({
  params: z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
  }),
});

export const createEmployeeSalaryStructureSchema = z.object({
  body: z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
    effectiveFrom: z.string().min(1, 'Effective from date is required'),
    basicSalary: z.number().min(0, 'Basic salary must be positive'),
    components: z.array(
      z.object({
        componentId: z.string().uuid(),
        value: z.number(),
      })
    ),
  }),
});

export const updateEmployeeSalaryStructureSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid salary structure ID'),
  }),
  body: z.object({
    effectiveFrom: z.string().optional(),
    basicSalary: z.number().min(0).optional(),
    components: z.array(
      z.object({
        componentId: z.string().uuid(),
        value: z.number(),
      })
    ).optional(),
  }),
});

// Payroll Processing
export const getPayrollsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    companyId: z.string().uuid().optional(),
    employeeId: z.string().uuid().optional(),
    month: z.string().optional(),
    year: z.string().optional(),
    status: z.enum(['draft', 'processed', 'approved', 'paid']).optional(),
  }),
});

export const getPayrollByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid payroll ID'),
  }),
});

export const generatePayrollSchema = z.object({
  body: z.object({
    companyId: z.string().uuid('Invalid company ID'),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000),
    employeeIds: z.array(z.string().uuid()).optional(),
    departmentId: z.string().uuid().optional(),
  }),
});

export const processPayrollSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid payroll ID'),
  }),
});

export const approvePayrollSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid payroll ID'),
  }),
  body: z.object({
    remarks: z.string().optional(),
  }),
});

export const markPayrollPaidSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid payroll ID'),
  }),
  body: z.object({
    paymentDate: z.string().min(1, 'Payment date is required'),
    paymentMethod: z.enum(['bank_transfer', 'cash', 'cheque']),
    transactionReference: z.string().optional(),
    utrNumber: z.string().optional(),
  }),
});

// Payslips
export const getPayslipsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    employeeId: z.string().uuid().optional(),
    month: z.string().optional(),
    year: z.string().optional(),
  }),
});

export const getPayslipByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid payslip ID'),
  }),
});

export const generatePayslipSchema = z.object({
  params: z.object({
    payrollId: z.string().uuid('Invalid payroll ID'),
    employeeId: z.string().uuid('Invalid employee ID'),
  }),
});

// Adjustments
export const createPayrollAdjustmentSchema = z.object({
  body: z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000),
    type: z.enum(['bonus', 'deduction', 'arrear', 'advance', 'reimbursement']),
    amount: z.number(),
    reason: z.string().min(1, 'Reason is required'),
  }),
});

export const getPayrollAdjustmentsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    employeeId: z.string().uuid().optional(),
    month: z.string().optional(),
    year: z.string().optional(),
    type: z.enum(['bonus', 'deduction', 'arrear', 'advance', 'reimbursement']).optional(),
  }),
});

export const deletePayrollAdjustmentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid adjustment ID'),
  }),
});

// Payroll Reports
export const getPayrollReportSchema = z.object({
  query: z.object({
    companyId: z.string().uuid().optional(),
    departmentId: z.string().uuid().optional(),
    month: z.string().min(1, 'Month is required'),
    year: z.string().min(1, 'Year is required'),
    groupBy: z.enum(['department', 'designation', 'employee']).optional(),
  }),
});

export const getSalaryRegisterSchema = z.object({
  query: z.object({
    companyId: z.string().uuid().optional(),
    startMonth: z.string().min(1, 'Start month is required'),
    endMonth: z.string().min(1, 'End month is required'),
    year: z.string().min(1, 'Year is required'),
  }),
});

// Bulk operations
export const bulkApprovePayrollsSchema = z.object({
  body: z.object({
    payrollIds: z.array(z.string().uuid()),
    remarks: z.string().optional(),
  }),
});

export const bulkMarkPayrollsPaidSchema = z.object({
  body: z.object({
    payrollIds: z.array(z.string().uuid()),
    paymentDate: z.string().min(1, 'Payment date is required'),
    paymentMethod: z.enum(['bank_transfer', 'cash', 'cheque']),
  }),
});
