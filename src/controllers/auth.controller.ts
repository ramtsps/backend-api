import { Request, Response, NextFunction } from 'express';
import authService from '@services/auth.service';
import { successResponse, createdResponse } from '@utils/response';
import { asyncHandler } from '@middleware/error.middleware';

class AuthController {
  /**
   * Register new user
   * @route POST /api/v1/auth/register
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    return createdResponse(res, result, 'User registered successfully');
  });

  /**
   * Login user
   * @route POST /api/v1/auth/login
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body);
    return successResponse(res, result, 'Login successful');
  });

  /**
   * Refresh access token
   * @route POST /api/v1/auth/refresh
   */
  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.refreshToken(req.body.refreshToken);
    return successResponse(res, result, 'Token refreshed successfully');
  });

  /**
   * Logout user
   * @route POST /api/v1/auth/logout
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.logout(req.user!.userId);
    return successResponse(res, result, 'Logged out successfully');
  });

  /**
   * Get current user profile
   * @route GET /api/v1/auth/me
   */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.getProfile(req.user!.userId);
    return successResponse(res, result);
  });

  /**
   * Change password
   * @route POST /api/v1/auth/change-password
   */
  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(
      req.user!.userId,
      currentPassword,
      newPassword
    );
    return successResponse(res, result, 'Password changed successfully');
  });

  /**
   * Enable MFA
   * @route POST /api/v1/auth/mfa/enable
   */
  enableMfa = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.enableMfa(req.user!.userId);
    return successResponse(res, result, 'MFA setup initiated');
  });

  /**
   * Verify MFA token
   * @route POST /api/v1/auth/mfa/verify
   */
  verifyMfa = asyncHandler(async (req: Request, res: Response) => {
    const { token, secret } = req.body;
    const result = await authService.verifyMfa(req.user!.userId, token, secret);
    return successResponse(res, result, 'MFA verified successfully');
  });

  /**
   * Disable MFA
   * @route POST /api/v1/auth/mfa/disable
   */
  disableMfa = asyncHandler(async (req: Request, res: Response) => {
    const { password } = req.body;
    const result = await authService.disableMfa(req.user!.userId, password);
    return successResponse(res, result, 'MFA disabled successfully');
  });
}

export default new AuthController();
