import { Request, Response } from 'express';
import roleService from '@services/role.service';
import { successResponse, createdResponse, paginatedResponse } from '@utils/response';
import { asyncHandler } from '@middleware/error.middleware';

class RoleController {
  /**
   * Get all roles
   * @route GET /api/v1/roles
   */
  getRoles = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const filters = {
      companyId: req.query.companyId,
      search: req.query.search,
      isSystem: req.query.isSystem,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    };

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const result = await roleService.getRoles(filters, page, limit, requestingUser);

    return paginatedResponse(
      res,
      result.roles,
      page,
      limit,
      result.total,
      'Roles retrieved successfully'
    );
  });

  /**
   * Get role by ID
   * @route GET /api/v1/roles/:id
   */
  getRoleById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const role = await roleService.getRoleById(id);
    return successResponse(res, role, 'Role retrieved successfully');
  });

  /**
   * Create role
   * @route POST /api/v1/roles
   */
  createRole = asyncHandler(async (req: Request, res: Response) => {
    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const role = await roleService.createRole(req.body, requestingUser);
    return createdResponse(res, role, 'Role created successfully');
  });

  /**
   * Update role
   * @route PUT /api/v1/roles/:id
   */
  updateRole = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const role = await roleService.updateRole(id, req.body, requestingUser);
    return successResponse(res, role, 'Role updated successfully');
  });

  /**
   * Delete role
   * @route DELETE /api/v1/roles/:id
   */
  deleteRole = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const result = await roleService.deleteRole(id, requestingUser);
    return successResponse(res, result, 'Role deleted successfully');
  });

  // ===== ROLE PERMISSIONS =====

  /**
   * Get role permissions
   * @route GET /api/v1/roles/:id/permissions
   */
  getRolePermissions = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const permissions = await roleService.getRolePermissions(id);
    return successResponse(res, { permissions }, 'Role permissions retrieved successfully');
  });

  /**
   * Assign permissions to role
   * @route POST /api/v1/roles/:id/permissions
   */
  assignPermissionsToRole = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { permissionIds } = req.body;
    const result = await roleService.assignPermissionsToRole(id, permissionIds);
    return successResponse(res, result, 'Permissions assigned successfully');
  });

  /**
   * Remove permission from role
   * @route DELETE /api/v1/roles/:id/permissions/:permissionId
   */
  removePermissionFromRole = asyncHandler(async (req: Request, res: Response) => {
    const { id, permissionId } = req.params;
    const result = await roleService.removePermissionFromRole(id, permissionId);
    return successResponse(res, result, 'Permission removed successfully');
  });

  // ===== USER ROLES =====

  /**
   * Get users by role
   * @route GET /api/v1/roles/:id/users
   */
  getUsersByRole = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await roleService.getUsersByRole(id, page, limit);

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
   * Assign role to user
   * @route POST /api/v1/roles/:id/users
   */
  assignRoleToUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId } = req.body;
    const result = await roleService.assignRoleToUser(id, userId);
    return successResponse(res, result, 'Role assigned to user successfully');
  });

  /**
   * Remove role from user
   * @route DELETE /api/v1/roles/:id/users/:userId
   */
  removeRoleFromUser = asyncHandler(async (req: Request, res: Response) => {
    const { id, userId } = req.params;
    const result = await roleService.removeRoleFromUser(id, userId);
    return successResponse(res, result, 'Role removed from user successfully');
  });

  /**
   * Clone role
   * @route POST /api/v1/roles/:id/clone
   */
  cloneRole = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const role = await roleService.cloneRole(id, req.body);
    return createdResponse(res, role, 'Role cloned successfully');
  });

  /**
   * Seed default roles
   * @route POST /api/v1/roles/seed
   */
  seedDefaultRoles = asyncHandler(async (req: Request, res: Response) => {
    const { companyId } = req.body;
    const result = await roleService.seedDefaultRoles(companyId);
    return createdResponse(res, result, 'Default roles seeded successfully');
  });
}

export default new RoleController();
