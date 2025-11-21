import { z } from 'zod';

// Get permissions
export const getPermissionsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    module: z.string().optional(),
    action: z.string().optional(),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

// Get permission by ID
export const getPermissionByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid permission ID'),
  }),
});

// Create permission
export const createPermissionSchema = z.object({
  body: z.object({
    module: z.string().min(1, 'Module is required').max(100),
    action: z.string().min(1, 'Action is required').max(100),
    description: z.string().optional(),
    code: z.string().min(1, 'Permission code is required').max(100).regex(
      /^[a-z_]+\.[a-z_]+$/,
      'Permission code must be in format: module.action (e.g., payroll.create)'
    ),
  }),
});

// Update permission
export const updatePermissionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid permission ID'),
  }),
  body: z.object({
    module: z.string().min(1).max(100).optional(),
    action: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    code: z.string().min(1).max(100).regex(
      /^[a-z_]+\.[a-z_]+$/,
      'Permission code must be in format: module.action'
    ).optional(),
  }),
});

// Delete permission
export const deletePermissionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid permission ID'),
  }),
});

// Get permissions by module
export const getPermissionsByModuleSchema = z.object({
  query: z.object({
    module: z.string().min(1, 'Module is required'),
  }),
});

// Bulk create permissions
export const bulkCreatePermissionsSchema = z.object({
  body: z.object({
    permissions: z.array(
      z.object({
        module: z.string().min(1).max(100),
        action: z.string().min(1).max(100),
        description: z.string().optional(),
        code: z.string().min(1).max(100).regex(/^[a-z_]+\.[a-z_]+$/),
      })
    ).min(1, 'At least one permission is required'),
  }),
});
