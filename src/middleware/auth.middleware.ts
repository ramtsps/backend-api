import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '@utils/errors';
import { verifyAccessToken, extractTokenFromHeader, JwtPayload } from '@utils/jwt';
import { cache, cacheKeys } from '@/lib/redis';
import prisma from '@/lib/prisma';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & {
        permissions?: string[];
      };
    }
  }
}

/**
 * Authenticate user middleware
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    // Verify token
    const payload = verifyAccessToken(token);

    // Check if user is still active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        isActive: true,
        isSuperAdmin: true,
        role: true,
        companyId: true,
        employeeId: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive');
    }

    // Attach user to request
    req.user = {
      ...payload,
      isSuperAdmin: user.isSuperAdmin,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authorize by user roles
 */
export const authorize = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Super admin has access to everything
      if (req.user.isSuperAdmin) {
        return next();
      }

      // Check if user role is allowed
      if (!allowedRoles.includes(req.user.role)) {
        throw new ForbiddenError('Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Authorize by permissions
 */
export const authorizePermission = (requiredPermissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Super admin has all permissions
      if (req.user.isSuperAdmin) {
        return next();
      }

      // Get user permissions from cache or database
      let userPermissions = await cache.get<string[]>(
        cacheKeys.permissions(req.user.userId)
      );

      if (!userPermissions) {
        // Fetch from database
        const userRoles = await prisma.userRole_Mapping.findMany({
          where: { userId: req.user.userId },
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        });

        userPermissions = userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code)
        );

        // Cache for 1 hour
        await cache.set(cacheKeys.permissions(req.user.userId), userPermissions, 3600);
      }

      // Check if user has all required permissions
      const hasAllPermissions = requiredPermissions.every((perm) =>
        userPermissions!.includes(perm)
      );

      if (!hasAllPermissions) {
        throw new ForbiddenError('Insufficient permissions');
      }

      req.user.permissions = userPermissions;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user belongs to company (multi-tenant isolation)
 */
export const checkCompanyAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Super admin can access all companies
    if (req.user.isSuperAdmin) {
      return next();
    }

    const companyId = req.params.companyId || req.body.companyId || req.query.companyId;

    if (!companyId) {
      throw new ForbiddenError('Company ID required');
    }

    // Check if user belongs to the company
    if (req.user.companyId !== companyId) {
      throw new ForbiddenError('Access denied to this company');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Super admin only middleware
 */
export const superAdminOnly = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!req.user.isSuperAdmin) {
      throw new ForbiddenError('Super admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication (doesn't fail if no token)
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (token) {
      const payload = verifyAccessToken(token);
      req.user = payload;
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};
