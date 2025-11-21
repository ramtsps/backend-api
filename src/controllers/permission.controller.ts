import { Request, Response } from 'express';
import permissionService from '@services/permission.service';
import { successResponse, createdResponse, paginatedResponse } from '@utils/response';
import { asyncHandler } from '@middleware/error.middleware';

class PermissionController {
  /**
   * Get all permissions
   * @route GET /api/v1/permissions
   */
  getPermissions = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;

    const filters = {
      module: req.query.module,
      action: req.query.action,
      search: req.query.search,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    };

    const result = await permissionService.getPermissions(filters, page, limit);

    return paginatedResponse(
      res,
      result.permissions,
      page,
      limit,
      result.total,
      'Permissions retrieved successfully'
    );
  });

  /**
   * Get permission by ID
   * @route GET /api/v1/permissions/:id
   */
  getPermissionById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const permission = await permissionService.getPermissionById(id);
    return successResponse(res, permission, 'Permission retrieved successfully');
  });

  /**
   * Get permissions by module
   * @route GET /api/v1/permissions/by-module
   */
  getPermissionsByModule = asyncHandler(async (req: Request, res: Response) => {
    const { module } = req.query;
    const permissions = await permissionService.getPermissionsByModule(module as string);
    return successResponse(res, permissions, 'Permissions retrieved successfully');
  });

  /**
   * Create permission
   * @route POST /api/v1/permissions
   */
  createPermission = asyncHandler(async (req: Request, res: Response) => {
    const permission = await permissionService.createPermission(req.body);
    return createdResponse(res, permission, 'Permission created successfully');
  });

  /**
   * Bulk create permissions
   * @route POST /api/v1/permissions/bulk
   */
  bulkCreatePermissions = asyncHandler(async (req: Request, res: Response) => {
    const result = await permissionService.bulkCreatePermissions(req.body.permissions);
    return createdResponse(res, result, 'Permissions created successfully');
  });

  /**
   * Update permission
   * @route PUT /api/v1/permissions/:id
   */
  updatePermission = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const permission = await permissionService.updatePermission(id, req.body);
    return successResponse(res, permission, 'Permission updated successfully');
  });

  /**
   * Delete permission
   * @route DELETE /api/v1/permissions/:id
   */
  deletePermission = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await permissionService.deletePermission(id);
    return successResponse(res, result, 'Permission deleted successfully');
  });

  /**
   * Get all modules
   * @route GET /api/v1/permissions/modules
   */
  getModules = asyncHandler(async (req: Request, res: Response) => {
    const modules = await permissionService.getModules();
    return successResponse(res, { modules }, 'Modules retrieved successfully');
  });

  /**
   * Get all actions
   * @route GET /api/v1/permissions/actions
   */
  getActions = asyncHandler(async (req: Request, res: Response) => {
    const actions = await permissionService.getActions();
    return successResponse(res, { actions }, 'Actions retrieved successfully');
  });

  /**
   * Seed default permissions
   * @route POST /api/v1/permissions/seed
   */
  seedDefaultPermissions = asyncHandler(async (req: Request, res: Response) => {
    const result = await permissionService.seedDefaultPermissions();
    return createdResponse(res, result, 'Default permissions seeded successfully');
  });
}

export default new PermissionController();
