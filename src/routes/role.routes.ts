import { Router } from 'express';
import { authenticate, authorize, superAdminOnly } from '@middleware/auth.middleware';
import roleController from '@controllers/role.controller';
import { validate } from '@middleware/validation.middleware';
import {
  getRolesSchema,
  getRoleByIdSchema,
  createRoleSchema,
  updateRoleSchema,
  deleteRoleSchema,
  assignPermissionsToRoleSchema,
  removePermissionFromRoleSchema,
  getRolePermissionsSchema,
  getUsersByRoleSchema,
  assignRoleToUserSchema,
  removeRoleFromUserSchema,
  cloneRoleSchema,
} from '@validators/role.validator';

const router = Router();

// All role routes require authentication
router.use(authenticate);

// Seed default roles (Super Admin only)
router.post(
  '/seed',
  superAdminOnly,
  roleController.seedDefaultRoles
);

// Get all roles
router.get(
  '/',
  authorize(['admin', 'hr']),
  validate(getRolesSchema),
  roleController.getRoles
);

// Get role by ID
router.get(
  '/:id',
  authorize(['admin', 'hr']),
  validate(getRoleByIdSchema),
  roleController.getRoleById
);

// Create role
router.post(
  '/',
  authorize(['admin']),
  validate(createRoleSchema),
  roleController.createRole
);

// Update role
router.put(
  '/:id',
  authorize(['admin']),
  validate(updateRoleSchema),
  roleController.updateRole
);

// Delete role
router.delete(
  '/:id',
  authorize(['admin']),
  validate(deleteRoleSchema),
  roleController.deleteRole
);

// Clone role
router.post(
  '/:id/clone',
  authorize(['admin']),
  validate(cloneRoleSchema),
  roleController.cloneRole
);

// ===== ROLE PERMISSIONS =====

// Get role permissions
router.get(
  '/:id/permissions',
  authorize(['admin', 'hr']),
  validate(getRolePermissionsSchema),
  roleController.getRolePermissions
);

// Assign permissions to role
router.post(
  '/:id/permissions',
  authorize(['admin']),
  validate(assignPermissionsToRoleSchema),
  roleController.assignPermissionsToRole
);

// Remove permission from role
router.delete(
  '/:id/permissions/:permissionId',
  authorize(['admin']),
  validate(removePermissionFromRoleSchema),
  roleController.removePermissionFromRole
);

// ===== USER ROLES =====

// Get users by role
router.get(
  '/:id/users',
  authorize(['admin', 'hr']),
  validate(getUsersByRoleSchema),
  roleController.getUsersByRole
);

// Assign role to user
router.post(
  '/:id/users',
  authorize(['admin', 'hr']),
  validate(assignRoleToUserSchema),
  roleController.assignRoleToUser
);

// Remove role from user
router.delete(
  '/:id/users/:userId',
  authorize(['admin', 'hr']),
  validate(removeRoleFromUserSchema),
  roleController.removeRoleFromUser
);

export default router;
