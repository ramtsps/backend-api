import { z } from 'zod';

// Get users list
export const getUsersSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    role: z.enum(['admin', 'hr', 'manager', 'employee', 'finance', 'accounts']).optional(),
    companyId: z.string().uuid().optional(),
    isActive: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

// Get user by ID
export const getUserByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
});

// Create user
export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    role: z.enum(['admin', 'hr', 'manager', 'employee', 'finance', 'accounts']),
    companyId: z.string().uuid('Invalid company ID').optional(),
    employeeId: z.string().uuid('Invalid employee ID').optional(),
    phoneNumber: z.string().optional(),
    isActive: z.boolean().optional(),
    emailVerified: z.boolean().optional(),
  }),
});

// Update user
export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
  body: z.object({
    email: z.string().email('Invalid email address').optional(),
    firstName: z.string().min(1, 'First name is required').optional(),
    lastName: z.string().min(1, 'Last name is required').optional(),
    role: z.enum(['admin', 'hr', 'manager', 'employee', 'finance', 'accounts']).optional(),
    phoneNumber: z.string().optional(),
    isActive: z.boolean().optional(),
    emailVerified: z.boolean().optional(),
  }),
});

// Delete user
export const deleteUserSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
});

// Activate/Deactivate user
export const toggleUserStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
  body: z.object({
    isActive: z.boolean(),
  }),
});

// Reset user password
export const resetUserPasswordSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
  body: z.object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    sendEmail: z.boolean().optional(),
  }),
});

// Get user permissions
export const getUserPermissionsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
});

// Update user permissions
export const updateUserPermissionsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
  body: z.object({
    permissions: z.array(z.string()),
  }),
});

// Bulk user operations
export const bulkCreateUsersSchema = z.object({
  body: z.object({
    users: z.array(
      z.object({
        email: z.string().email(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        role: z.enum(['admin', 'hr', 'manager', 'employee', 'finance', 'accounts']),
        employeeId: z.string().uuid().optional(),
      })
    ),
  }),
});

export const bulkDeleteUsersSchema = z.object({
  body: z.object({
    userIds: z.array(z.string().uuid()),
  }),
});

export const bulkUpdateUserStatusSchema = z.object({
  body: z.object({
    userIds: z.array(z.string().uuid()),
    isActive: z.boolean(),
  }),
});
