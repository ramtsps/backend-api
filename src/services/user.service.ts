import prisma from '@/lib/prisma';
import { hashPassword, generateRandomPassword } from '@utils/password';
import { cache, cacheKeys } from '@/lib/redis';
import { 
  NotFoundError, 
  ConflictError, 
  BadRequestError,
  ForbiddenError 
} from '@utils/errors';

interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId?: string;
  employeeId?: string;
  phoneNumber?: string;
  isActive?: boolean;
  emailVerified?: boolean;
}

interface UpdateUserInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  phoneNumber?: string;
  isActive?: boolean;
  emailVerified?: boolean;
}

interface GetUsersFilters {
  search?: string;
  role?: string;
  companyId?: string;
  isActive?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class UserService {
  /**
   * Get all users with filters and pagination
   */
  async getUsers(
    filters: GetUsersFilters,
    page: number = 1,
    limit: number = 20,
    requestingUser: { userId: string; companyId?: string; isSuperAdmin: boolean }
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    // Multi-tenant filter: Non-super admins can only see their company users
    if (!requestingUser.isSuperAdmin && requestingUser.companyId) {
      where.companyId = requestingUser.companyId;
    }

    // Apply filters
    if (filters.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive === 'true';
    }

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Sorting
    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'asc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phoneNumber: true,
          isActive: true,
          emailVerified: true,
          isSuperAdmin: true,
          mfaEnabled: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          companyId: true,
          employeeId: true,
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              designation: {
                select: {
                  id: true,
                  name: true,
                },
              },
              department: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total, page, limit };
  }

  /**
   * Get user by ID
   */
  async getUserById(
    userId: string,
    requestingUser: { userId: string; companyId?: string; isSuperAdmin: boolean }
  ) {
    // Try to get from cache first
    const cached = await cache.get(cacheKeys.user(userId));
    if (cached) {
      return cached;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phoneNumber: true,
        isActive: true,
        emailVerified: true,
        isSuperAdmin: true,
        mfaEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        companyId: true,
        employeeId: true,
        company: {
          select: {
            id: true,
            name: true,
            industry: true,
            subscription_tier: true,
          },
        },
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            email: true,
            phoneNumber: true,
            hireDate: true,
            status: true,
            designation: {
              select: {
                id: true,
                name: true,
              },
            },
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Multi-tenant check: Non-super admins can only view users from their company
    if (!requestingUser.isSuperAdmin) {
      if (user.companyId !== requestingUser.companyId) {
        throw new ForbiddenError('Access denied');
      }
    }

    // Cache the user data
    await cache.set(cacheKeys.user(userId), user, 3600);

    return user;
  }

  /**
   * Create new user
   */
  async createUser(
    input: CreateUserInput,
    requestingUser: { userId: string; companyId?: string; isSuperAdmin: boolean }
  ) {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Multi-tenant check: Use requesting user's company if not super admin
    let companyId = input.companyId;
    if (!requestingUser.isSuperAdmin) {
      companyId = requestingUser.companyId;
    }

    // If companyId provided, verify it exists
    if (companyId) {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });
      if (!company) {
        throw new NotFoundError('Company not found');
      }
    }

    // If employeeId provided, verify it exists and belongs to the company
    if (input.employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: input.employeeId },
      });
      if (!employee) {
        throw new NotFoundError('Employee not found');
      }
      if (companyId && employee.companyId !== companyId) {
        throw new BadRequestError('Employee does not belong to the specified company');
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(input.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash: hashedPassword,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        companyId,
        employeeId: input.employeeId,
        phoneNumber: input.phoneNumber,
        isActive: input.isActive !== undefined ? input.isActive : true,
        emailVerified: input.emailVerified || false,
        isSuperAdmin: false,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phoneNumber: true,
        isActive: true,
        emailVerified: true,
        companyId: true,
        employeeId: true,
        createdAt: true,
      },
    });

    // TODO: Send welcome email with credentials

    return user;
  }

  /**
   * Update user
   */
  async updateUser(
    userId: string,
    input: UpdateUserInput,
    requestingUser: { userId: string; companyId?: string; isSuperAdmin: boolean }
  ) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    // Multi-tenant check
    if (!requestingUser.isSuperAdmin) {
      if (existingUser.companyId !== requestingUser.companyId) {
        throw new ForbiddenError('Access denied');
      }
    }

    // If updating email, check for conflicts
    if (input.email && input.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });
      if (emailExists) {
        throw new ConflictError('Email already in use');
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        email: input.email?.toLowerCase(),
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        phoneNumber: input.phoneNumber,
        isActive: input.isActive,
        emailVerified: input.emailVerified,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phoneNumber: true,
        isActive: true,
        emailVerified: true,
        updatedAt: true,
      },
    });

    // Clear cache
    await cache.del(cacheKeys.user(userId));
    await cache.del(cacheKeys.permissions(userId));

    return updatedUser;
  }

  /**
   * Delete user
   */
  async deleteUser(
    userId: string,
    requestingUser: { userId: string; companyId?: string; isSuperAdmin: boolean }
  ) {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Multi-tenant check
    if (!requestingUser.isSuperAdmin) {
      if (user.companyId !== requestingUser.companyId) {
        throw new ForbiddenError('Access denied');
      }
    }

    // Prevent self-deletion
    if (userId === requestingUser.userId) {
      throw new BadRequestError('Cannot delete your own account');
    }

    // Soft delete (deactivate) instead of hard delete
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    // Clear cache
    await cache.del(cacheKeys.user(userId));
    await cache.del(cacheKeys.permissions(userId));

    return { message: 'User deleted successfully' };
  }

  /**
   * Toggle user active status
   */
  async toggleUserStatus(
    userId: string,
    isActive: boolean,
    requestingUser: { userId: string; companyId?: string; isSuperAdmin: boolean }
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Multi-tenant check
    if (!requestingUser.isSuperAdmin) {
      if (user.companyId !== requestingUser.companyId) {
        throw new ForbiddenError('Access denied');
      }
    }

    // Prevent self-deactivation
    if (userId === requestingUser.userId && !isActive) {
      throw new BadRequestError('Cannot deactivate your own account');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    // Clear cache
    await cache.del(cacheKeys.user(userId));

    return updatedUser;
  }

  /**
   * Reset user password
   */
  async resetUserPassword(
    userId: string,
    newPassword: string,
    sendEmail: boolean = false,
    requestingUser: { userId: string; companyId?: string; isSuperAdmin: boolean }
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Multi-tenant check
    if (!requestingUser.isSuperAdmin) {
      if (user.companyId !== requestingUser.companyId) {
        throw new ForbiddenError('Access denied');
      }
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    // TODO: Send email with new password if sendEmail is true

    return { message: 'Password reset successfully' };
  }

  /**
   * Get user permissions (based on role)
   */
  async getUserPermissions(userId: string) {
    // Try to get from cache
    const cached = await cache.get<string[]>(cacheKeys.permissions(userId));
    if (cached) {
      return { permissions: cached };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isSuperAdmin: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Define permissions based on role
    const rolePermissions: Record<string, string[]> = {
      admin: [
        'users:read',
        'users:create',
        'users:update',
        'users:delete',
        'companies:read',
        'companies:update',
        'employees:*',
        'attendance:*',
        'leave:*',
        'payroll:*',
        'projects:*',
        'reports:*',
      ],
      hr: [
        'users:read',
        'users:create',
        'users:update',
        'employees:*',
        'attendance:*',
        'leave:*',
        'payroll:read',
        'payroll:process',
        'reports:hr',
      ],
      manager: [
        'users:read',
        'employees:read',
        'attendance:read',
        'attendance:approve',
        'leave:read',
        'leave:approve',
        'projects:*',
        'tasks:*',
        'reports:team',
      ],
      finance: [
        'users:read',
        'employees:read',
        'payroll:*',
        'invoices:*',
        'accounting:*',
        'reports:financial',
      ],
      accounts: [
        'users:read',
        'employees:read',
        'payroll:read',
        'invoices:*',
        'accounting:*',
        'reports:financial',
      ],
      employee: [
        'users:read:self',
        'employees:read:self',
        'attendance:read:self',
        'attendance:create:self',
        'leave:read:self',
        'leave:create:self',
        'timesheets:*:self',
        'tasks:read',
      ],
    };

    let permissions = rolePermissions[user.role] || [];

    // Super admin gets all permissions
    if (user.isSuperAdmin) {
      permissions = ['*'];
    }

    // Cache permissions
    await cache.set(cacheKeys.permissions(userId), permissions, 3600);

    return { permissions };
  }

  /**
   * Bulk create users
   */
  async bulkCreateUsers(
    users: Array<Omit<CreateUserInput, 'password'>>,
    requestingUser: { userId: string; companyId?: string; isSuperAdmin: boolean }
  ) {
    const results = {
      successful: [] as any[],
      failed: [] as any[],
    };

    for (const userInput of users) {
      try {
        // Generate random password for bulk creation
        const password = generateRandomPassword();

        const user = await this.createUser(
          { ...userInput, password },
          requestingUser
        );

        results.successful.push({
          email: user.email,
          userId: user.id,
          generatedPassword: password,
        });
      } catch (error: any) {
        results.failed.push({
          email: userInput.email,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Bulk delete users
   */
  async bulkDeleteUsers(
    userIds: string[],
    requestingUser: { userId: string; companyId?: string; isSuperAdmin: boolean }
  ) {
    const results = {
      successful: [] as string[],
      failed: [] as any[],
    };

    for (const userId of userIds) {
      try {
        await this.deleteUser(userId, requestingUser);
        results.successful.push(userId);
      } catch (error: any) {
        results.failed.push({
          userId,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Bulk update user status
   */
  async bulkUpdateUserStatus(
    userIds: string[],
    isActive: boolean,
    requestingUser: { userId: string; companyId?: string; isSuperAdmin: boolean }
  ) {
    const results = {
      successful: [] as string[],
      failed: [] as any[],
    };

    for (const userId of userIds) {
      try {
        await this.toggleUserStatus(userId, isActive, requestingUser);
        results.successful.push(userId);
      } catch (error: any) {
        results.failed.push({
          userId,
          error: error.message,
        });
      }
    }

    return results;
  }
}

export default new UserService();
