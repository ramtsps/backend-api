import { Request, Response } from 'express';
import userService from '@services/user.service';
import { successResponse, createdResponse, paginatedResponse } from '@utils/response';
import { asyncHandler } from '@middleware/error.middleware';

class UserController {
  /**
   * Get all users
   * @route GET /api/v1/users
   */
  getUsers = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const filters = {
      search: req.query.search as string,
      role: req.query.role as string,
      companyId: req.query.companyId as string,
      isActive: req.query.isActive as string,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
    };

    const requestingUser = {
      userId: req.user!.userId,
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const result = await userService.getUsers(filters, page, limit, requestingUser);

    return paginatedResponse(
      res,
      result.users,
      page,
      limit,
      result.total,
      'Users retrieved successfully'
    );
  });

  /**
   * Get user by ID
   * @route GET /api/v1/users/:id
   */
  getUserById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const requestingUser = {
      userId: req.user!.userId,
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const user = await userService.getUserById(id, requestingUser);

    return successResponse(res, user, 'User retrieved successfully');
  });

  /**
   * Create new user
   * @route POST /api/v1/users
   */
  createUser = asyncHandler(async (req: Request, res: Response) => {
    const requestingUser = {
      userId: req.user!.userId,
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const user = await userService.createUser(req.body, requestingUser);

    return createdResponse(res, user, 'User created successfully');
  });

  /**
   * Update user
   * @route PUT /api/v1/users/:id
   */
  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const requestingUser = {
      userId: req.user!.userId,
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const user = await userService.updateUser(id, req.body, requestingUser);

    return successResponse(res, user, 'User updated successfully');
  });

  /**
   * Delete user
   * @route DELETE /api/v1/users/:id
   */
  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const requestingUser = {
      userId: req.user!.userId,
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const result = await userService.deleteUser(id, requestingUser);

    return successResponse(res, result, 'User deleted successfully');
  });

  /**
   * Activate user
   * @route PATCH /api/v1/users/:id/activate
   */
  activateUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const requestingUser = {
      userId: req.user!.userId,
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const user = await userService.toggleUserStatus(id, true, requestingUser);

    return successResponse(res, user, 'User activated successfully');
  });

  /**
   * Deactivate user
   * @route PATCH /api/v1/users/:id/deactivate
   */
  deactivateUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const requestingUser = {
      userId: req.user!.userId,
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const user = await userService.toggleUserStatus(id, false, requestingUser);

    return successResponse(res, user, 'User deactivated successfully');
  });

  /**
   * Reset user password
   * @route POST /api/v1/users/:id/reset-password
   */
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { newPassword, sendEmail } = req.body;

    const requestingUser = {
      userId: req.user!.userId,
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const result = await userService.resetUserPassword(
      id,
      newPassword,
      sendEmail,
      requestingUser
    );

    return successResponse(res, result, 'Password reset successfully');
  });

  /**
   * Get user permissions
   * @route GET /api/v1/users/:id/permissions
   */
  getUserPermissions = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await userService.getUserPermissions(id);

    return successResponse(res, result, 'Permissions retrieved successfully');
  });

  /**
   * Bulk create users
   * @route POST /api/v1/users/bulk-create
   */
  bulkCreateUsers = asyncHandler(async (req: Request, res: Response) => {
    const { users } = req.body;

    const requestingUser = {
      userId: req.user!.userId,
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const result = await userService.bulkCreateUsers(users, requestingUser);

    return successResponse(res, result, 'Bulk user creation completed');
  });

  /**
   * Bulk delete users
   * @route POST /api/v1/users/bulk-delete
   */
  bulkDeleteUsers = asyncHandler(async (req: Request, res: Response) => {
    const { userIds } = req.body;

    const requestingUser = {
      userId: req.user!.userId,
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const result = await userService.bulkDeleteUsers(userIds, requestingUser);

    return successResponse(res, result, 'Bulk user deletion completed');
  });

  /**
   * Bulk update user status
   * @route POST /api/v1/users/bulk-status-update
   */
  bulkUpdateStatus = asyncHandler(async (req: Request, res: Response) => {
    const { userIds, isActive } = req.body;

    const requestingUser = {
      userId: req.user!.userId,
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const result = await userService.bulkUpdateUserStatus(userIds, isActive, requestingUser);

    return successResponse(res, result, 'Bulk status update completed');
  });
}

export default new UserController();
