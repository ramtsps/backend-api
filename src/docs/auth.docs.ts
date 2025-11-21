/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register new company and admin user
 *     description: |
 *       Creates a new company with an admin user account.
 *       This is the first step for onboarding a new company to the platform.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: User login
 *     description: Authenticate user and receive access and refresh tokens
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: User logout
 *     description: Invalidate current session and clear tokens
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Refresh access token
 *     description: Get a new access token using refresh token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Token refreshed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Invalid refresh token
 */

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get current user profile
 *     description: Returns the authenticated user's profile information
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User profile retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Request password reset
 *     description: Send password reset email to user
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@company.com
 *     responses:
 *       200:
 *         description: Password reset email sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Password reset email sent
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

export {};
