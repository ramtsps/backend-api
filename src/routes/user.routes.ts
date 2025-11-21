import { Router } from 'express';
import { authenticate, authorize, superAdminOnly } from '@middleware/auth.middleware';
import userController from '@controllers/user.controller';
import { validate } from '@middleware/validation.middleware';
import {
  getUsersSchema,
  getUserByIdSchema,
  createUserSchema,
  updateUserSchema,
  deleteUserSchema,
  resetUserPasswordSchema,
  getUserPermissionsSchema,
  bulkCreateUsersSchema,
  bulkDeleteUsersSchema,
  bulkUpdateUserStatusSchema,
} from '@validators/user.validator';

const router = Router();

router.use(authenticate);

// Bulk operations (must be before :id routes)
router.post(
  '/bulk-create',
  authorize(['admin']),
  validate(bulkCreateUsersSchema),
  userController.bulkCreateUsers
);

router.post(
  '/bulk-delete',
  authorize(['admin']),
  validate(bulkDeleteUsersSchema),
  userController.bulkDeleteUsers
);

router.post(
  '/bulk-status-update',
  authorize(['admin']),
  validate(bulkUpdateUserStatusSchema),
  userController.bulkUpdateStatus
);

// User CRUD
router.get(
  '/',
  authorize(['admin', 'hr']),
  validate(getUsersSchema),
  userController.getUsers
);

router.get(
  '/:id',
  validate(getUserByIdSchema),
  userController.getUserById
);

router.post(
  '/',
  authorize(['admin']),
  validate(createUserSchema),
  userController.createUser
);

router.put(
  '/:id',
  authorize(['admin']),
  validate(updateUserSchema),
  userController.updateUser
);

router.delete(
  '/:id',
  authorize(['admin']),
  validate(deleteUserSchema),
  userController.deleteUser
);

// User status
router.patch(
  '/:id/activate',
  authorize(['admin']),
  validate(getUserByIdSchema),
  userController.activateUser
);

router.patch(
  '/:id/deactivate',
  authorize(['admin']),
  validate(getUserByIdSchema),
  userController.deactivateUser
);

// Password reset
router.post(
  '/:id/reset-password',
  authorize(['admin']),
  validate(resetUserPasswordSchema),
  userController.resetPassword
);

// Permissions
router.get(
  '/:id/permissions',
  validate(getUserPermissionsSchema),
  userController.getUserPermissions
);

export default router;