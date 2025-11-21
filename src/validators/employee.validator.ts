import { z } from 'zod';

// Get employees
export const getEmployeesSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    companyId: z.string().uuid().optional(),
    departmentId: z.string().uuid().optional(),
    designationId: z.string().uuid().optional(),
    status: z.enum(['active', 'inactive', 'terminated', 'on_leave']).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

// Get employee by ID
export const getEmployeeByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid employee ID'),
  }),
});

// Create employee
export const createEmployeeSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    phoneNumber: z.string().min(1, 'Phone number is required'),
    dateOfBirth: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']).optional(),
    
    // Employment details
    employeeCode: z.string().min(1, 'Employee code is required'),
    companyId: z.string().uuid('Invalid company ID'),
    departmentId: z.string().uuid('Invalid department ID').optional(),
    designationId: z.string().uuid('Invalid designation ID').optional(),
    managerId: z.string().uuid('Invalid manager ID').optional(),
    hireDate: z.string().min(1, 'Hire date is required'),
    employmentType: z.enum(['full_time', 'part_time', 'contract', 'intern']).optional(),
    workLocation: z.string().optional(),
    
    // Address
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
    
    // Salary
    salary: z.number().optional(),
    salaryType: z.enum(['monthly', 'hourly', 'daily']).optional(),
    
    // Status
    status: z.enum(['active', 'inactive', 'terminated', 'on_leave']).optional(),
    
    // Bank details
    bankDetails: z.object({
      bankName: z.string().optional(),
      accountNumber: z.string().optional(),
      ifscCode: z.string().optional(),
      accountHolderName: z.string().optional(),
      branchName: z.string().optional(),
    }).optional(),
    
    // Emergency contact
    emergencyContact: z.object({
      name: z.string().optional(),
      relationship: z.string().optional(),
      phoneNumber: z.string().optional(),
    }).optional(),
  }),
});

// Update employee
export const updateEmployeeSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid employee ID'),
  }),
  body: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phoneNumber: z.string().optional(),
    dateOfBirth: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']).optional(),
    
    // Employment details
    departmentId: z.string().uuid().optional(),
    designationId: z.string().uuid().optional(),
    managerId: z.string().uuid().optional(),
    employmentType: z.enum(['full_time', 'part_time', 'contract', 'intern']).optional(),
    workLocation: z.string().optional(),
    
    // Address
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
    
    // Salary
    salary: z.number().optional(),
    salaryType: z.enum(['monthly', 'hourly', 'daily']).optional(),
    
    // Status
    status: z.enum(['active', 'inactive', 'terminated', 'on_leave']).optional(),
  }),
});

// Delete employee
export const deleteEmployeeSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid employee ID'),
  }),
});

// Update employee status
export const updateEmployeeStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid employee ID'),
  }),
  body: z.object({
    status: z.enum(['active', 'inactive', 'terminated', 'on_leave']),
    terminationDate: z.string().optional(),
    terminationReason: z.string().optional(),
  }),
});

// Bank details
export const updateBankDetailsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid employee ID'),
  }),
  body: z.object({
    bankName: z.string().min(1, 'Bank name is required'),
    accountNumber: z.string().min(1, 'Account number is required'),
    ifscCode: z.string().min(1, 'IFSC code is required'),
    accountHolderName: z.string().min(1, 'Account holder name is required'),
    branchName: z.string().optional(),
    accountType: z.enum(['savings', 'current']).optional(),
  }),
});

// Emergency contacts
export const getEmergencyContactsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid employee ID'),
  }),
});

export const addEmergencyContactSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid employee ID'),
  }),
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    relationship: z.string().min(1, 'Relationship is required'),
    phoneNumber: z.string().min(1, 'Phone number is required'),
    email: z.string().email().optional(),
    address: z.string().optional(),
    isPrimary: z.boolean().optional(),
  }),
});

export const updateEmergencyContactSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid employee ID'),
    contactId: z.string().uuid('Invalid contact ID'),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    relationship: z.string().optional(),
    phoneNumber: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
    isPrimary: z.boolean().optional(),
  }),
});

export const deleteEmergencyContactSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid employee ID'),
    contactId: z.string().uuid('Invalid contact ID'),
  }),
});

// Documents
export const getEmployeeDocumentsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid employee ID'),
  }),
  query: z.object({
    type: z.string().optional(),
  }),
});

export const addEmployeeDocumentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid employee ID'),
  }),
  body: z.object({
    name: z.string().min(1, 'Document name is required'),
    type: z.enum(['resume', 'id_proof', 'address_proof', 'certificate', 'contract', 'other']),
    documentNumber: z.string().optional(),
    fileUrl: z.string().url('Invalid file URL'),
    fileSize: z.number().optional(),
    mimeType: z.string().optional(),
    expiryDate: z.string().optional(),
    isVerified: z.boolean().optional(),
  }),
});

export const updateEmployeeDocumentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid employee ID'),
    documentId: z.string().uuid('Invalid document ID'),
  }),
  body: z.object({
    name: z.string().optional(),
    documentNumber: z.string().optional(),
    expiryDate: z.string().optional(),
    isVerified: z.boolean().optional(),
  }),
});

export const deleteEmployeeDocumentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid employee ID'),
    documentId: z.string().uuid('Invalid document ID'),
  }),
});

// Reporting structure
export const getReportingStructureSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid employee ID'),
  }),
});

export const updateManagerSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid employee ID'),
  }),
  body: z.object({
    managerId: z.string().uuid('Invalid manager ID').nullable(),
  }),
});

// Bulk operations
export const bulkCreateEmployeesSchema = z.object({
  body: z.object({
    employees: z.array(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        phoneNumber: z.string(),
        employeeCode: z.string(),
        companyId: z.string().uuid(),
        departmentId: z.string().uuid().optional(),
        designationId: z.string().uuid().optional(),
        hireDate: z.string(),
        salary: z.number().optional(),
      })
    ),
  }),
});

export const bulkUpdateEmployeeStatusSchema = z.object({
  body: z.object({
    employeeIds: z.array(z.string().uuid()),
    status: z.enum(['active', 'inactive', 'terminated', 'on_leave']),
  }),
});
