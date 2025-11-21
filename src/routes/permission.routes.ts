import { Router } from 'express';
import { authenticate, superAdminOnly } from '@middleware/auth.middleware';
import permissionController from '@controllers/permission.controller';
import { validate } from '@middleware/validation.middleware';
import {
  getPermissionsSchema,
  getPermissionByIdSchema,
  createPermissionSchema,
  updatePermissionSchema,
  deletePermissionSchema,
  getPermissionsByModuleSchema,
  bulkCreatePermissionsSchema,
} from '@validators/permission.validator';

const router = Router();

// All permission routes require authentication
router.use(authenticate);

// Get all permissions
router.get(
  '/',
  validate(getPermissionsSchema),
  permissionController.getPermissions
);

// Get modules
router.get(
  '/modules',
  permissionController.getModules
);

// Get actions
router.get(
  '/actions',
  permissionController.getActions
);

// Get permissions by module
router.get(
  '/by-module',
  validate(getPermissionsByModuleSchema),
  permissionController.getPermissionsByModule
);

// Seed default permissions (Super Admin only)
router.post(
  '/seed',
  superAdminOnly,
  permissionController.seedDefaultPermissions
);

// Bulk create permissions (Super Admin only)
router.post(
  '/bulk',
  superAdminOnly,
  validate(bulkCreatePermissionsSchema),
  permissionController.bulkCreatePermissions
);

// Get permission by ID
router.get(
  '/:id',
  validate(getPermissionByIdSchema),
  permissionController.getPermissionById
);

// Create permission (Super Admin only)
router.post(
  '/',
  superAdminOnly,
  validate(createPermissionSchema),
  permissionController.createPermission
);

// Update permission (Super Admin only)
router.put(
  '/:id',
  superAdminOnly,
  validate(updatePermissionSchema),
  permissionController.updatePermission
);

// Delete permission (Super Admin only)
router.delete(
  '/:id',
  superAdminOnly,
  validate(deletePermissionSchema),
  permissionController.deletePermission
);

export default router;
