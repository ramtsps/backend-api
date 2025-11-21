import { z } from 'zod';

// Expense Categories
export const getExpenseCategoriesSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    companyId: z.string().uuid().optional(),
    isActive: z.string().optional(),
  }),
});

export const createExpenseCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Category name is required'),
    code: z.string().min(1, 'Category code is required'),
    companyId: z.string().uuid('Invalid company ID'),
    description: z.string().optional(),
    requiresReceipt: z.boolean().optional(),
    maxAmount: z.number().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateExpenseCategorySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid category ID'),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    requiresReceipt: z.boolean().optional(),
    maxAmount: z.number().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const deleteExpenseCategorySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid category ID'),
  }),
});

// Expense Claims
export const getExpenseClaimsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    employeeId: z.string().uuid().optional(),
    categoryId: z.string().uuid().optional(),
    status: z.enum(['draft', 'submitted', 'approved', 'rejected', 'reimbursed']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export const getExpenseClaimByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid expense claim ID'),
  }),
});

export const createExpenseClaimSchema = z.object({
  body: z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
    categoryId: z.string().uuid('Invalid category ID'),
    date: z.string().min(1, 'Expense date is required'),
    amount: z.number().min(0, 'Amount must be positive'),
    merchant: z.string().min(1, 'Merchant/Vendor name is required'),
    description: z.string().min(1, 'Description is required'),
    receiptUrl: z.string().optional(),
    paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'other']).optional(),
    projectId: z.string().uuid().optional(),
    billable: z.boolean().optional(),
  }),
});

export const updateExpenseClaimSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid expense claim ID'),
  }),
  body: z.object({
    categoryId: z.string().uuid().optional(),
    date: z.string().optional(),
    amount: z.number().min(0).optional(),
    merchant: z.string().optional(),
    description: z.string().optional(),
    receiptUrl: z.string().optional(),
    paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'other']).optional(),
    projectId: z.string().uuid().optional(),
    billable: z.boolean().optional(),
  }),
});

export const deleteExpenseClaimSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid expense claim ID'),
  }),
});

export const submitExpenseClaimSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid expense claim ID'),
  }),
});

export const approveExpenseClaimSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid expense claim ID'),
  }),
  body: z.object({
    status: z.enum(['approved', 'rejected']),
    approvedAmount: z.number().min(0).optional(),
    remarks: z.string().optional(),
  }),
});

export const reimburseExpenseClaimSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid expense claim ID'),
  }),
  body: z.object({
    reimbursementDate: z.string().min(1, 'Reimbursement date is required'),
    paymentMethod: z.enum(['bank_transfer', 'cash', 'cheque']),
    transactionReference: z.string().optional(),
  }),
});

// Expense Reports
export const getExpenseReportSchema = z.object({
  query: z.object({
    companyId: z.string().uuid().optional(),
    departmentId: z.string().uuid().optional(),
    employeeId: z.string().uuid().optional(),
    categoryId: z.string().uuid().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    status: z.enum(['draft', 'submitted', 'approved', 'rejected', 'reimbursed']).optional(),
    groupBy: z.enum(['employee', 'category', 'department', 'month']).optional(),
  }),
});

// Bulk operations
export const bulkSubmitExpenseClaimsSchema = z.object({
  body: z.object({
    expenseClaimIds: z.array(z.string().uuid()),
  }),
});

export const bulkApproveExpenseClaimsSchema = z.object({
  body: z.object({
    expenseClaimIds: z.array(z.string().uuid()),
    status: z.enum(['approved', 'rejected']),
    remarks: z.string().optional(),
  }),
});

export const bulkReimburseExpenseClaimsSchema = z.object({
  body: z.object({
    expenseClaimIds: z.array(z.string().uuid()),
    reimbursementDate: z.string().min(1, 'Reimbursement date is required'),
    paymentMethod: z.enum(['bank_transfer', 'cash', 'cheque']),
  }),
});
