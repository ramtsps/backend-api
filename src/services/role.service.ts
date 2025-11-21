import prisma from '@/lib/prisma';
import { cache } from '@/lib/redis';
import { 
  NotFoundError, 
  ConflictError, 
  BadRequestError,
  ForbiddenError 
} from '@utils/errors';

class RoleService {
  /**
   * Get roles
   */
  async getRoles(
    filters: any,
    page: number = 1,
    limit: number = 50,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    // Multi-tenant filter
    if (!requestingUser.isSuperAdmin && requestingUser.companyId) {
      where.companyId = requestingUser.companyId;
    }

    if (filters.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { displayName: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.isSystem !== undefined) {
      where.isSystem = filters.isSystem === 'true';
    }

    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'asc';
    } else {
      orderBy.displayName = 'asc';
    }

    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: {
            select: {
              rolePermissions: true,
              userRoles: true,
            },
          },
        },
      }),
      prisma.role.count({ where }),
    ]);

    return { roles, total, page, limit };
  }

  /**
   * Get role by ID
   */
  async getRoleById(roleId: string) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: {
            rolePermissions: true,
            userRoles: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    return role;
  }

  /**
   * Create role
   */
  async createRole(
    data: any,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    // Multi-tenant check
    let companyId = data.companyId;
    if (!requestingUser.isSuperAdmin) {
      companyId = requestingUser.companyId;
    }

    // Check if role name already exists for company
    const existing = await prisma.role.findFirst({
      where: {
        companyId,
        name: data.name,
      },
    });

    if (existing) {
      throw new ConflictError(`Role with name '${data.name}' already exists for this company`);
    }

    const role = await prisma.role.create({
      data: {
        companyId,
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        permissions: data.permissions || {},
        isSystem: data.isSystem || false,
      },
    });

    return role;
  }

  /**
   * Update role
   */
  async updateRole(
    roleId: string,
    data: any,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    // Multi-tenant check
    if (!requestingUser.isSuperAdmin && role.companyId !== requestingUser.companyId) {
      throw new ForbiddenError('Access denied');
    }

    // Cannot modify system roles unless super admin
    if (role.isSystem && !requestingUser.isSuperAdmin) {
      throw new ForbiddenError('Cannot modify system roles');
    }

    // Check name conflict
    if (data.name && data.name !== role.name) {
      const existing = await prisma.role.findFirst({
        where: {
          companyId: role.companyId,
          name: data.name,
          id: { not: roleId },
        },
      });

      if (existing) {
        throw new ConflictError(`Role with name '${data.name}' already exists`);
      }
    }

    const updated = await prisma.role.update({
      where: { id: roleId },
      data: {
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        permissions: data.permissions,
      },
    });

    // Clear permission caches for all users with this role
    await this.clearRolePermissionCaches(roleId);

    return updated;
  }

  /**
   * Delete role
   */
  async deleteRole(
    roleId: string,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    // Multi-tenant check
    if (!requestingUser.isSuperAdmin && role.companyId !== requestingUser.companyId) {
      throw new ForbiddenError('Access denied');
    }

    // Cannot delete system roles unless super admin
    if (role.isSystem && !requestingUser.isSuperAdmin) {
      throw new ForbiddenError('Cannot delete system roles');
    }

    if (role._count.userRoles > 0) {
      throw new BadRequestError(
        `Cannot delete role '${role.displayName}' as it is assigned to ${role._count.userRoles} user(s)`
      );
    }

    await prisma.role.delete({
      where: { id: roleId },
    });

    return { message: 'Role deleted successfully' };
  }

  // ===== ROLE PERMISSIONS =====

  /**
   * Get role permissions
   */
  async getRolePermissions(roleId: string) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    return role.rolePermissions.map(rp => rp.permission);
  }

  /**
   * Assign permissions to role
   */
  async assignPermissionsToRole(roleId: string, permissionIds: string[]) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    // Verify all permissions exist
    const permissions = await prisma.permission.findMany({
      where: { id: { in: permissionIds } },
    });

    if (permissions.length !== permissionIds.length) {
      throw new BadRequestError('One or more permission IDs are invalid');
    }

    // Get existing role permissions
    const existing = await prisma.rolePermission.findMany({
      where: {
        roleId,
        permissionId: { in: permissionIds },
      },
    });

    const existingPermissionIds = existing.map(rp => rp.permissionId);
    const newPermissionIds = permissionIds.filter(id => !existingPermissionIds.includes(id));

    // Create new role permissions
    const created = await prisma.rolePermission.createMany({
      data: newPermissionIds.map(permissionId => ({
        roleId,
        permissionId,
      })),
    });

    // Clear permission caches
    await this.clearRolePermissionCaches(roleId);

    return {
      message: 'Permissions assigned successfully',
      assignedCount: created.count,
      alreadyExisted: existing.length,
    };
  }

  /**
   * Remove permission from role
   */
  async removePermissionFromRole(roleId: string, permissionId: string) {
    const rolePermission = await prisma.rolePermission.findFirst({
      where: {
        roleId,
        permissionId,
      },
    });

    if (!rolePermission) {
      throw new NotFoundError('Permission not assigned to this role');
    }

    await prisma.rolePermission.delete({
      where: { id: rolePermission.id },
    });

    // Clear permission caches
    await this.clearRolePermissionCaches(roleId);

    return { message: 'Permission removed successfully' };
  }

  // ===== USER ROLES =====

  /**
   * Get users by role
   */
  async getUsersByRole(roleId: string, page: number = 1, limit: number = 50) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    const skip = (page - 1) * limit;

    const [userRoles, total] = await Promise.all([
      prisma.userRole_Mapping.findMany({
        where: { roleId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              isActive: true,
              createdAt: true,
            },
          },
        },
        skip,
        take: limit,
      }),
      prisma.userRole_Mapping.count({ where: { roleId } }),
    ]);

    return {
      users: userRoles.map(ur => ur.user),
      total,
      page,
      limit,
    };
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(roleId: string, userId: string) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if user belongs to same company
    if (user.companyId !== role.companyId) {
      throw new BadRequestError('User and role must belong to the same company');
    }

    // Check if already assigned
    const existing = await prisma.userRole_Mapping.findFirst({
      where: {
        userId,
        roleId,
      },
    });

    if (existing) {
      throw new ConflictError('Role already assigned to this user');
    }

    await prisma.userRole_Mapping.create({
      data: {
        userId,
        roleId,
      },
    });

    // Clear user's permission cache
    await cache.del(`permissions:${userId}`);

    return { message: 'Role assigned successfully' };
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(roleId: string, userId: string) {
    const userRole = await prisma.userRole_Mapping.findFirst({
      where: {
        userId,
        roleId,
      },
    });

    if (!userRole) {
      throw new NotFoundError('Role not assigned to this user');
    }

    await prisma.userRole_Mapping.delete({
      where: { id: userRole.id },
    });

    // Clear user's permission cache
    await cache.del(`permissions:${userId}`);

    return { message: 'Role removed successfully' };
  }

  /**
   * Clone role
   */
  async cloneRole(roleId: string, data: any) {
    const sourceRole = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!sourceRole) {
      throw new NotFoundError('Source role not found');
    }

    const targetCompanyId = data.companyId || sourceRole.companyId;

    // Check if name exists in target company
    const existing = await prisma.role.findFirst({
      where: {
        companyId: targetCompanyId,
        name: data.name,
      },
    });

    if (existing) {
      throw new ConflictError(`Role with name '${data.name}' already exists in target company`);
    }

    // Create cloned role
    const clonedRole = await prisma.role.create({
      data: {
        companyId: targetCompanyId,
        name: data.name,
        displayName: data.displayName,
        description: sourceRole.description,
        permissions: sourceRole.permissions,
        isSystem: false,
      },
    });

    // Clone permissions
    const permissionIds = sourceRole.rolePermissions.map(rp => rp.permissionId);
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map(permissionId => ({
          roleId: clonedRole.id,
          permissionId,
        })),
      });
    }

    return clonedRole;
  }

  // ===== HELPER METHODS =====

  /**
   * Clear permission caches for all users with a role
   */
  private async clearRolePermissionCaches(roleId: string) {
    const userRoles = await prisma.userRole_Mapping.findMany({
      where: { roleId },
      select: { userId: true },
    });

    for (const userRole of userRoles) {
      await cache.del(`permissions:${userRole.userId}`);
    }
  }

  /**
   * Seed default roles
   */
  async seedDefaultRoles(companyId: string) {
    const defaultRoles = [
      {
        name: 'admin',
        displayName: 'Administrator',
        description: 'Full access to all company features',
        permissionCodes: ['*'],
        isSystem: true,
      },
      {
        name: 'hr_manager',
        displayName: 'HR Manager',
        description: 'Manage employees, attendance, leave, and performance',
        permissionCodes: [
          'employee.*',
          'attendance.*',
          'leave.*',
          'performance.*',
          'document.read',
          'document.create',
          'document.share',
          'report.read',
          'report.create',
        ],
        isSystem: true,
      },
      {
        name: 'finance_manager',
        displayName: 'Finance Manager',
        description: 'Manage payroll, expenses, and financial operations',
        permissionCodes: [
          'payroll.*',
          'expense.*',
          'invoice.*',
          'report.read',
          'report.create',
          'report.export',
        ],
        isSystem: true,
      },
      {
        name: 'project_manager',
        displayName: 'Project Manager',
        description: 'Manage projects, tasks, and team timesheets',
        permissionCodes: [
          'project.*',
          'task.*',
          'timesheet.read',
          'timesheet.approve',
          'document.read',
          'document.create',
          'report.read',
        ],
        isSystem: true,
      },
      {
        name: 'team_lead',
        displayName: 'Team Lead',
        description: 'Manage team tasks and approve timesheets',
        permissionCodes: [
          'task.read',
          'task.create',
          'task.update',
          'task.assign',
          'timesheet.read',
          'timesheet.approve',
          'attendance.read',
          'leave.read',
          'leave.approve',
        ],
        isSystem: true,
      },
      {
        name: 'employee',
        displayName: 'Employee',
        description: 'Standard employee access',
        permissionCodes: [
          'attendance.create',
          'attendance.read',
          'leave.create',
          'leave.read',
          'timesheet.create',
          'timesheet.read',
          'expense.create',
          'expense.read',
          'task.read',
          'task.update',
          'document.read',
        ],
        isSystem: true,
      },
    ];

    const createdRoles: any[] = [];

    for (const roleData of defaultRoles) {
      // Check if role already exists
      const existing = await prisma.role.findFirst({
        where: {
          companyId,
          name: roleData.name,
        },
      });

      if (existing) {
        continue;
      }

      // Create role
      const role = await prisma.role.create({
        data: {
          companyId,
          name: roleData.name,
          displayName: roleData.displayName,
          description: roleData.description,
          permissions: roleData.permissionCodes,
          isSystem: roleData.isSystem,
        },
      });

      // Assign permissions
      if (roleData.permissionCodes[0] !== '*') {
        const permissions = await prisma.permission.findMany({
          where: {
            code: { in: roleData.permissionCodes },
          },
        });

        if (permissions.length > 0) {
          await prisma.rolePermission.createMany({
            data: permissions.map(permission => ({
              roleId: role.id,
              permissionId: permission.id,
            })),
          });
        }
      }

      createdRoles.push(role);
    }

    return {
      message: 'Default roles seeded successfully',
      created: createdRoles.length,
      roles: createdRoles,
    };
  }
}

export default new RoleService();
