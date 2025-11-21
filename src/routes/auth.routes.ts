import { Router } from 'express';
import authController from '@controllers/auth.controller';
import { validate } from '@middleware/validation.middleware';
import { authenticate } from '@middleware/auth.middleware';
import { authLimiter } from '@middleware/rate-limit.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  enableMfaSchema,
  verifyMfaSchema,
  disableMfaSchema,
} from '@validators/auth.validator';

const router = Router();

// Public routes
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);

// Protected routes
router.use(authenticate);
router.post('/logout', authController.logout);
router.get('/me', authController.getProfile);
router.post('/change-password', validate(changePasswordSchema), authController.changePassword);

// MFA routes
router.post('/mfa/enable', validate(enableMfaSchema), authController.enableMfa);
router.post('/mfa/verify', validate(verifyMfaSchema), authController.verifyMfa);
router.post('/mfa/disable', validate(disableMfaSchema), authController.disableMfa);

export default router;
