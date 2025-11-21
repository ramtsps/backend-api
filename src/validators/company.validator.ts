import { z } from 'zod';

// Get companies
export const getCompaniesSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    industry: z.string().optional(),
    isActive: z.string().optional(),
    subscription_tier: z.enum(['free', 'trial', 'basic', 'premium', 'enterprise']).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

// Get company by ID
export const getCompanyByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid company ID'),
  }),
});

// Create company
export const createCompanySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Company name is required'),
    industry: z.string().optional(),
    companySize: z.string().optional(),
    website: z.string().url().optional().or(z.literal('')),
    email: z.string().email().optional(),
    phoneNumber: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
    taxId: z.string().optional(),
    registrationNumber: z.string().optional(),
    subscription_tier: z.enum(['free', 'trial', 'basic', 'premium', 'enterprise']).optional(),
    subscription_start_date: z.string().datetime().optional(),
    subscription_end_date: z.string().datetime().optional(),
    isActive: z.boolean().optional(),
    settings: z.record(z.any()).optional(),
  }),
});

// Update company
export const updateCompanySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid company ID'),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    industry: z.string().optional(),
    companySize: z.string().optional(),
    website: z.string().url().optional().or(z.literal('')),
    email: z.string().email().optional(),
    phoneNumber: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
    taxId: z.string().optional(),
    registrationNumber: z.string().optional(),
    subscription_tier: z.enum(['free', 'trial', 'basic', 'premium', 'enterprise']).optional(),
    subscription_start_date: z.string().datetime().optional(),
    subscription_end_date: z.string().datetime().optional(),
    isActive: z.boolean().optional(),
  }),
});

// Delete company
export const deleteCompanySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid company ID'),
  }),
});

// Company configuration
export const getCompanyConfigurationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid company ID'),
  }),
});

export const updateCompanyConfigurationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid company ID'),
  }),
  body: z.object({
    general: z.object({
      fiscalYearStart: z.string().optional(),
      weekStartDay: z.enum(['monday', 'sunday', 'saturday']).optional(),
      timeZone: z.string().optional(),
      dateFormat: z.string().optional(),
      timeFormat: z.string().optional(),
      currency: z.string().optional(),
    }).optional(),
    attendance: z.object({
      workingDays: z.array(z.string()).optional(),
      workingHoursStart: z.string().optional(),
      workingHoursEnd: z.string().optional(),
      halfDayHours: z.number().optional(),
      fullDayHours: z.number().optional(),
      allowEarlyCheckout: z.boolean().optional(),
      lateMarkGracePeriod: z.number().optional(),
    }).optional(),
    leave: z.object({
      allowNegativeBalance: z.boolean().optional(),
      carryForwardEnabled: z.boolean().optional(),
      maxCarryForwardDays: z.number().optional(),
      probationLeaveEnabled: z.boolean().optional(),
      advanceLeaveEnabled: z.boolean().optional(),
    }).optional(),
    payroll: z.object({
      payrollCycle: z.enum(['monthly', 'biweekly', 'weekly']).optional(),
      salaryProcessingDay: z.number().optional(),
      paymentMode: z.enum(['bank_transfer', 'cheque', 'cash']).optional(),
      overtimeEnabled: z.boolean().optional(),
      overtimeRate: z.number().optional(),
    }).optional(),
  }),
});

// Company features
export const getCompanyFeaturesSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid company ID'),
  }),
});

export const updateCompanyFeaturesSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid company ID'),
  }),
  body: z.object({
    features: z.object({
      attendance: z.boolean().optional(),
      leave: z.boolean().optional(),
      payroll: z.boolean().optional(),
      projects: z.boolean().optional(),
      tasks: z.boolean().optional(),
      timesheets: z.boolean().optional(),
      performance: z.boolean().optional(),
      skills: z.boolean().optional(),
      documents: z.boolean().optional(),
      invoicing: z.boolean().optional(),
      accounting: z.boolean().optional(),
      leads: z.boolean().optional(),
      recruitment: z.boolean().optional(),
      training: z.boolean().optional(),
    }),
  }),
});

// Company settings
export const updateCompanySettingsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid company ID'),
  }),
  body: z.object({
    settings: z.record(z.any()),
  }),
});

// Departments
export const getDepartmentsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid company ID'),
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    isActive: z.string().optional(),
  }),
});

export const createDepartmentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid company ID'),
  }),
  body: z.object({
    name: z.string().min(1, 'Department name is required'),
    description: z.string().optional(),
    headId: z.string().uuid().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateDepartmentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid company ID'),
    departmentId: z.string().uuid('Invalid department ID'),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    headId: z.string().uuid().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const deleteDepartmentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid company ID'),
    departmentId: z.string().uuid('Invalid department ID'),
  }),
});

// Designations
export const getDesignationsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid company ID'),
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    departmentId: z.string().uuid().optional(),
    isActive: z.string().optional(),
  }),
});

export const createDesignationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid company ID'),
  }),
  body: z.object({
    name: z.string().min(1, 'Designation name is required'),
    description: z.string().optional(),
    departmentId: z.string().uuid().optional(),
    level: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateDesignationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid company ID'),
    designationId: z.string().uuid('Invalid designation ID'),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    departmentId: z.string().uuid().optional(),
    level: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const deleteDesignationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid company ID'),
    designationId: z.string().uuid('Invalid designation ID'),
  }),
});
