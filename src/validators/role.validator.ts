import { z } from 'zod';

// Get roles
export const getRolesSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    companyId: z.string().uuid().optional(),
    search: z.string().optional(),
    isSystem: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

// Get role by ID
export const getRoleByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid role ID'),
  }),
});

// Create role
export const createRoleSchema = z.object({
  body: z.object({
    companyId: z.string().uuid('Invalid company ID'),
    name: z.string().min(1, 'Role name is required').max(100).regex(
      /^[a-z_]+$/,
      'Role name must be lowercase with underscores only (e.g., hr_manager)'
    ),
    displayName: z.string().min(1, 'Display name is required').max(255),
    description: z.string().optional(),
    permissions: z.array(z.string()).optional(), // Legacy JSON field
    isSystem: z.boolean().optional(),
  }),
});

// Update role
export const updateRoleSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid role ID'),
  }),
  body: z.object({
    name: z.string().min(1).max(100).regex(/^[a-z_]+$/).optional(),
    displayName: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    permissions: z.array(z.string()).optional(),
  }),
});

// Delete role
export const deleteRoleSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid role ID'),
  }),
});

// Assign permissions to role
export const assignPermissionsToRoleSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid role ID'),
  }),
  body: z.object({
    permissionIds: z.array(z.string().uuid()).min(1, 'At least one permission ID is required'),
  }),
});

// Remove permission from role
export const removePermissionFromRoleSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid role ID'),
    permissionId: z.string().uuid('Invalid permission ID'),
  }),
});

// Get role permissions
export const getRolePermissionsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid role ID'),
  }),
});

// Get users by role
export const getUsersByRoleSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid role ID'),
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

// Assign role to user
export const assignRoleToUserSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid role ID'),
  }),
  body: z.object({
    userId: z.string().uuid('Invalid user ID'),
  }),
});

// Remove role from user
export const removeRoleFromUserSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid role ID'),
    userId: z.string().uuid('Invalid user ID'),
  }),
});

// Clone role
export const cloneRoleSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid role ID'),
  }),
  body: z.object({
    name: z.string().min(1).max(100).regex(/^[a-z_]+$/),
    displayName: z.string().min(1).max(255),
    companyId: z.string().uuid().optional(),
  }),
});
