import prisma from '@/lib/prisma';
import { hashPassword, comparePassword, generateRandomPassword } from '@utils/password';
import { generateTokenPair, verifyRefreshToken, JwtPayload } from '@utils/jwt';
import { cache, cacheKeys } from '@/lib/redis';
import { 
  UnauthorizedError, 
  ConflictError, 
  NotFoundError,
  BadRequestError 
} from '@utils/errors';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import config from '@config/index';
import { v4 as uuidv4 } from 'uuid';

interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  role?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

class AuthService {
  /**
   * Register new user and company
   */
  async register(input: RegisterInput) {
    const { email, password, firstName, lastName, companyName, role = 'admin' } = input;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user with company in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create company if provided
      let company = null;
      if (companyName) {
        company = await tx.company.create({
          data: {
            name: companyName,
            isActive: true,
            subscription_tier: 'trial',
            subscription_start_date: new Date(),
            subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
          },
        });
      }

      // Create user
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash: hashedPassword,
          firstName,
          lastName,
          role,
          companyId: company?.id,
          isActive: true,
          emailVerified: false,
          isSuperAdmin: false,
        },
      });

      // Create employee record if company exists
      let employee = null;
      if (company) {
        employee = await tx.employee.create({
          data: {
            userId: user.id,
            companyId: company.id,
            firstName,
            lastName,
            email: email.toLowerCase(),
            employeeCode: `EMP${Date.now().toString().slice(-6)}`,
            hireDate: new Date(),
            status: 'active',
            employmentType: 'full-time',
          },
        });

        // Update user with employeeId
        await tx.user.update({
          where: { id: user.id },
          data: { employeeId: employee.id },
        });
      }

      return { user, company, employee };
    });

    // Generate tokens
    const tokens = generateTokenPair({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      companyId: result.company?.id,
      employeeId: result.employee?.id,
      isSuperAdmin: false,
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        companyId: result.company?.id,
        employeeId: result.employee?.id,
      },
      company: result.company,
      tokens,
    };
  }

  /**
   * Login user
   */
  async login(input: LoginInput) {
    const { email, password } = input;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        company: true,
        employee: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check MFA
    if (user.mfaEnabled) {
      return {
        requiresMfa: true,
        userId: user.id,
        mfaRequired: true,
      };
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId || undefined,
      employeeId: user.employeeId || undefined,
      isSuperAdmin: user.isSuperAdmin,
    });

    // Cache user data
    await cache.set(cacheKeys.user(user.id), {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    }, 3600);

    return {
      requiresMfa: false,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
        employeeId: user.employeeId,
        isSuperAdmin: user.isSuperAdmin,
        emailVerified: user.emailVerified,
        mfaEnabled: user.mfaEnabled,
      },
      company: user.company,
      tokens,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Generate new token pair
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId || undefined,
      employeeId: user.employeeId || undefined,
      isSuperAdmin: user.isSuperAdmin,
    });

    return { tokens };
  }

  /**
   * Logout user
   */
  async logout(userId: string) {
    // Clear cached user data
    await cache.del(cacheKeys.user(userId));
    await cache.del(cacheKeys.permissions(userId));

    return { message: 'Logged out successfully' };
  }

  /**
   * Enable MFA for user
   */
  async enableMfa(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.mfaEnabled) {
      throw new BadRequestError('MFA is already enabled');
    }

    // Generate MFA secret
    const secret = speakeasy.generateSecret({
      name: `${config.mfa.appName} (${user.email})`,
      issuer: config.mfa.issuer,
    });

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    // Store secret temporarily (will be confirmed on verification)
    await cache.set(
      `mfa:setup:${userId}`,
      { secret: secret.base32 },
      600 // 10 minutes
    );

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      otpauthUrl: secret.otpauth_url,
    };
  }

  /**
   * Verify and confirm MFA setup
   */
  async verifyMfa(userId: string, token: string, secret?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    let mfaSecret = secret;

    // If no secret provided, get from cache (during setup)
    if (!mfaSecret) {
      const cached = await cache.get<{ secret: string }>(`mfa:setup:${userId}`);
      if (!cached) {
        throw new BadRequestError('MFA setup expired, please restart');
      }
      mfaSecret = cached.secret;
    } else {
      // Use stored secret (during login)
      mfaSecret = user.mfaSecret || '';
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: mfaSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      throw new UnauthorizedError('Invalid MFA token');
    }

    // If this was setup, save the secret and enable MFA
    if (!user.mfaEnabled && !secret) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaSecret: mfaSecret,
          mfaEnabled: true,
        },
      });

      // Clear setup cache
      await cache.del(`mfa:setup:${userId}`);
    }

    // If this was login verification, generate tokens
    if (user.mfaEnabled) {
      const tokens = generateTokenPair({
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId || undefined,
        employeeId: user.employeeId || undefined,
        isSuperAdmin: user.isSuperAdmin,
      });

      return {
        verified: true,
        tokens,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      };
    }

    return { verified: true };
  }

  /**
   * Disable MFA
   */
  async disableMfa(userId: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.mfaEnabled) {
      throw new BadRequestError('MFA is not enabled');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid password');
    }

    // Disable MFA
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    });

    return { message: 'MFA disabled successfully' };
  }

  /**
   * Change password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid current password');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  /**
   * Get current user profile
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: true,
        employee: {
          include: {
            department: true,
            designation: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyId: user.companyId,
      employeeId: user.employeeId,
      isSuperAdmin: user.isSuperAdmin,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
      lastLoginAt: user.lastLoginAt,
      company: user.company,
      employee: user.employee,
    };
  }
}

export default new AuthService();
