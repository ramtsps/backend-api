import prisma from '@/lib/prisma';
import { cache } from '@/lib/redis';
import { 
  NotFoundError, 
  ConflictError, 
  BadRequestError,
  ForbiddenError 
} from '@utils/errors';

class PermissionService {
  /**
   * Get all permissions
   */
  async getPermissions(
    filters: any,
    page: number = 1,
    limit: number = 100
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.module) {
      where.module = filters.module;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.search) {
      where.OR = [
        { module: { contains: filters.search, mode: 'insensitive' } },
        { action: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'asc';
    } else {
      orderBy.module = 'asc';
    }

    const [permissions, total] = await Promise.all([
      prisma.permission.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: {
            select: {
              rolePermissions: true,
            },
          },
        },
      }),
      prisma.permission.count({ where }),
    ]);

    return { permissions, total, page, limit };
  }

  /**
   * Get permission by ID
   */
  async getPermissionById(permissionId: string) {
    const permission = await prisma.permission.findUnique({
      where: { id: permissionId },
      include: {
        rolePermissions: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                displayName: true,
                companyId: true,
              },
            },
          },
        },
      },
    });

    if (!permission) {
      throw new NotFoundError('Permission not found');
    }

    return permission;
  }

  /**
   * Get permissions by module
   */
  async getPermissionsByModule(module: string) {
    const permissions = await prisma.permission.findMany({
      where: { module },
      orderBy: { action: 'asc' },
    });

    return permissions;
  }

  /**
   * Create permission
   */
  async createPermission(data: any) {
    // Check if permission code already exists
    const existing = await prisma.permission.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new ConflictError(`Permission with code '${data.code}' already exists`);
    }

    const permission = await prisma.permission.create({
      data: {
        module: data.module,
        action: data.action,
        description: data.description,
        code: data.code,
      },
    });

    return permission;
  }

  /**
   * Bulk create permissions
   */
  async bulkCreatePermissions(permissionsData: any[]) {
    const created: any[] = [];
    const errors: any[] = [];

    for (const data of permissionsData) {
      try {
        // Check if permission code already exists
        const existing = await prisma.permission.findUnique({
          where: { code: data.code },
        });

        if (existing) {
          errors.push({
            code: data.code,
            error: 'Permission already exists',
          });
          continue;
        }

        const permission = await prisma.permission.create({
          data: {
            module: data.module,
            action: data.action,
            description: data.description,
            code: data.code,
          },
        });

        created.push(permission);
      } catch (error: any) {
        errors.push({
          code: data.code,
          error: error.message,
        });
      }
    }

    return {
      created: created.length,
      failed: errors.length,
      permissions: created,
      errors,
    };
  }

  /**
   * Update permission
   */
  async updatePermission(permissionId: string, data: any) {
    const permission = await prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      throw new NotFoundError('Permission not found');
    }

    // If updating code, check for conflicts
    if (data.code && data.code !== permission.code) {
      const existing = await prisma.permission.findUnique({
        where: { code: data.code },
      });

      if (existing) {
        throw new ConflictError(`Permission with code '${data.code}' already exists`);
      }
    }

    const updated = await prisma.permission.update({
      where: { id: permissionId },
      data: {
        module: data.module,
        action: data.action,
        description: data.description,
        code: data.code,
      },
    });

    // Clear all permission caches as they might be affected
    await this.clearAllPermissionCaches();

    return updated;
  }

  /**
   * Delete permission
   */
  async deletePermission(permissionId: string) {
    const permission = await prisma.permission.findUnique({
      where: { id: permissionId },
      include: {
        _count: {
          select: {
            rolePermissions: true,
          },
        },
      },
    });

    if (!permission) {
      throw new NotFoundError('Permission not found');
    }

    if (permission._count.rolePermissions > 0) {
      throw new BadRequestError(
        `Cannot delete permission '${permission.code}' as it is assigned to ${permission._count.rolePermissions} role(s)`
      );
    }

    await prisma.permission.delete({
      where: { id: permissionId },
    });

    return { message: 'Permission deleted successfully' };
  }

  /**
   * Get all modules
   */
  async getModules() {
    const permissions = await prisma.permission.findMany({
      select: { module: true },
      distinct: ['module'],
      orderBy: { module: 'asc' },
    });

    return permissions.map(p => p.module);
  }

  /**
   * Get all actions
   */
  async getActions() {
    const permissions = await prisma.permission.findMany({
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' },
    });

    return permissions.map(p => p.action);
  }

  /**
   * Clear all permission caches
   */
  private async clearAllPermissionCaches() {
    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true },
    });

    // Clear each user's permission cache
    for (const user of users) {
      await cache.del(`permissions:${user.id}`);
    }
  }

  /**
   * Seed default permissions
   */
  async seedDefaultPermissions() {
    const defaultPermissions = [
      // ===== ATTENDANCE =====
      { module: 'attendance', action: 'create', code: 'attendance.create', description: 'Create attendance records' },
      { module: 'attendance', action: 'read', code: 'attendance.read', description: 'View attendance records' },
      { module: 'attendance', action: 'update', code: 'attendance.update', description: 'Update attendance records' },
      { module: 'attendance', action: 'delete', code: 'attendance.delete', description: 'Delete attendance records' },
      { module: 'attendance', action: 'approve', code: 'attendance.approve', description: 'Approve attendance records' },

      // ===== LEAVE =====
      { module: 'leave', action: 'create', code: 'leave.create', description: 'Create leave requests' },
      { module: 'leave', action: 'read', code: 'leave.read', description: 'View leave requests' },
      { module: 'leave', action: 'update', code: 'leave.update', description: 'Update leave requests' },
      { module: 'leave', action: 'delete', code: 'leave.delete', description: 'Delete leave requests' },
      { module: 'leave', action: 'approve', code: 'leave.approve', description: 'Approve/reject leave requests' },

      // ===== PAYROLL =====
      { module: 'payroll', action: 'create', code: 'payroll.create', description: 'Create payroll records' },
      { module: 'payroll', action: 'read', code: 'payroll.read', description: 'View payroll records' },
      { module: 'payroll', action: 'update', code: 'payroll.update', description: 'Update payroll records' },
      { module: 'payroll', action: 'delete', code: 'payroll.delete', description: 'Delete payroll records' },
      { module: 'payroll', action: 'approve', code: 'payroll.approve', description: 'Approve payroll' },
      { module: 'payroll', action: 'process', code: 'payroll.process', description: 'Process payroll payments' },

      // ===== EMPLOYEE =====
      { module: 'employee', action: 'create', code: 'employee.create', description: 'Create employees' },
      { module: 'employee', action: 'read', code: 'employee.read', description: 'View employees' },
      { module: 'employee', action: 'update', code: 'employee.update', description: 'Update employees' },
      { module: 'employee', action: 'delete', code: 'employee.delete', description: 'Delete employees' },

      // ===== EXPENSE =====
      { module: 'expense', action: 'create', code: 'expense.create', description: 'Create expense claims' },
      { module: 'expense', action: 'read', code: 'expense.read', description: 'View expense claims' },
      { module: 'expense', action: 'update', code: 'expense.update', description: 'Update expense claims' },
      { module: 'expense', action: 'delete', code: 'expense.delete', description: 'Delete expense claims' },
      { module: 'expense', action: 'approve', code: 'expense.approve', description: 'Approve expense claims' },
      { module: 'expense', action: 'reimburse', code: 'expense.reimburse', description: 'Process reimbursements' },

      // ===== TIMESHEET =====
      { module: 'timesheet', action: 'create', code: 'timesheet.create', description: 'Create timesheets' },
      { module: 'timesheet', action: 'read', code: 'timesheet.read', description: 'View timesheets' },
      { module: 'timesheet', action: 'update', code: 'timesheet.update', description: 'Update timesheets' },
      { module: 'timesheet', action: 'delete', code: 'timesheet.delete', description: 'Delete timesheets' },
      { module: 'timesheet', action: 'approve', code: 'timesheet.approve', description: 'Approve timesheets' },

      // ===== PROJECT =====
      { module: 'project', action: 'create', code: 'project.create', description: 'Create projects' },
      { module: 'project', action: 'read', code: 'project.read', description: 'View projects' },
      { module: 'project', action: 'update', code: 'project.update', description: 'Update projects' },
      { module: 'project', action: 'delete', code: 'project.delete', description: 'Delete projects' },
      { module: 'project', action: 'manage_members', code: 'project.manage_members', description: 'Manage project team members' },

      // ===== TASK =====
      { module: 'task', action: 'create', code: 'task.create', description: 'Create tasks' },
      { module: 'task', action: 'read', code: 'task.read', description: 'View tasks' },
      { module: 'task', action: 'update', code: 'task.update', description: 'Update tasks' },
      { module: 'task', action: 'delete', code: 'task.delete', description: 'Delete tasks' },
      { module: 'task', action: 'assign', code: 'task.assign', description: 'Assign tasks to users' },

      // ===== PERFORMANCE =====
      { module: 'performance', action: 'create', code: 'performance.create', description: 'Create performance reviews' },
      { module: 'performance', action: 'read', code: 'performance.read', description: 'View performance reviews' },
      { module: 'performance', action: 'update', code: 'performance.update', description: 'Update performance reviews' },
      { module: 'performance', action: 'delete', code: 'performance.delete', description: 'Delete performance reviews' },
      { module: 'performance', action: 'approve', code: 'performance.approve', description: 'Approve performance reviews' },

      // ===== DOCUMENT =====
      { module: 'document', action: 'create', code: 'document.create', description: 'Upload documents' },
      { module: 'document', action: 'read', code: 'document.read', description: 'View documents' },
      { module: 'document', action: 'update', code: 'document.update', description: 'Update documents' },
      { module: 'document', action: 'delete', code: 'document.delete', description: 'Delete documents' },
      { module: 'document', action: 'share', code: 'document.share', description: 'Share documents' },

      // ===== USER =====
      { module: 'user', action: 'create', code: 'user.create', description: 'Create users' },
      { module: 'user', action: 'read', code: 'user.read', description: 'View users' },
      { module: 'user', action: 'update', code: 'user.update', description: 'Update users' },
      { module: 'user', action: 'delete', code: 'user.delete', description: 'Delete users' },

      // ===== COMPANY =====
      { module: 'company', action: 'create', code: 'company.create', description: 'Create companies' },
      { module: 'company', action: 'read', code: 'company.read', description: 'View companies' },
      { module: 'company', action: 'update', code: 'company.update', description: 'Update companies' },
      { module: 'company', action: 'delete', code: 'company.delete', description: 'Delete companies' },
      { module: 'company', action: 'configure', code: 'company.configure', description: 'Configure company settings' },

      // ===== DEPARTMENT =====
      { module: 'department', action: 'create', code: 'department.create', description: 'Create departments' },
      { module: 'department', action: 'read', code: 'department.read', description: 'View departments' },
      { module: 'department', action: 'update', code: 'department.update', description: 'Update departments' },
      { module: 'department', action: 'delete', code: 'department.delete', description: 'Delete departments' },

      // ===== ROLE =====
      { module: 'role', action: 'create', code: 'role.create', description: 'Create roles' },
      { module: 'role', action: 'read', code: 'role.read', description: 'View roles' },
      { module: 'role', action: 'update', code: 'role.update', description: 'Update roles' },
      { module: 'role', action: 'delete', code: 'role.delete', description: 'Delete roles' },
      { module: 'role', action: 'assign', code: 'role.assign', description: 'Assign roles to users' },

      // ===== REPORT =====
      { module: 'report', action: 'create', code: 'report.create', description: 'Create reports' },
      { module: 'report', action: 'read', code: 'report.read', description: 'View reports' },
      { module: 'report', action: 'export', code: 'report.export', description: 'Export reports' },

      // ===== INVOICE =====
      { module: 'invoice', action: 'create', code: 'invoice.create', description: 'Create invoices' },
      { module: 'invoice', action: 'read', code: 'invoice.read', description: 'View invoices' },
      { module: 'invoice', action: 'update', code: 'invoice.update', description: 'Update invoices' },
      { module: 'invoice', action: 'delete', code: 'invoice.delete', description: 'Delete invoices' },
      { module: 'invoice', action: 'send', code: 'invoice.send', description: 'Send invoices to clients' },

      // ===== CRM =====
      { module: 'crm', action: 'create', code: 'crm.create', description: 'Create leads/clients' },
      { module: 'crm', action: 'read', code: 'crm.read', description: 'View leads/clients' },
      { module: 'crm', action: 'update', code: 'crm.update', description: 'Update leads/clients' },
      { module: 'crm', action: 'delete', code: 'crm.delete', description: 'Delete leads/clients' },
      { module: 'crm', action: 'convert', code: 'crm.convert', description: 'Convert leads to clients' },
    ];

    const result = await this.bulkCreatePermissions(defaultPermissions);
    return result;
  }
}

export default new PermissionService();
