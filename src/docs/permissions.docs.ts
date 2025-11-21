/**
 * @swagger
 * /permissions:
 *   get:
 *     tags:
 *       - Permissions
 *     summary: Get all permissions
 *     description: |
 *       Retrieve a paginated list of all permissions in the system.
 *       Supports filtering by module, action, and search.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Items per page
 *       - in: query
 *         name: module
 *         schema:
 *           type: string
 *         description: Filter by module (e.g., payroll, attendance)
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action (e.g., create, read, approve)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in module, action, code, or description
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [module, action, code, createdAt]
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Permissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /permissions/{id}:
 *   get:
 *     tags:
 *       - Permissions
 *     summary: Get permission by ID
 *     description: Retrieve a single permission with its role assignments
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Permission ID
 *     responses:
 *       200:
 *         description: Permission retrieved successfully
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
 *                 data:
 *                   $ref: '#/components/schemas/Permission'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /permissions:
 *   post:
 *     tags:
 *       - Permissions
 *     summary: Create permission (Super Admin only)
 *     description: |
 *       Create a new permission. Only Super Admins can create permissions.
 *       Permission codes must follow the format: module.action (e.g., payroll.approve)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePermissionRequest'
 *     responses:
 *       201:
 *         description: Permission created successfully
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
 *                 data:
 *                   $ref: '#/components/schemas/Permission'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       409:
 *         description: Permission code already exists
 */

/**
 * @swagger
 * /permissions/seed:
 *   post:
 *     tags:
 *       - Permissions
 *     summary: Seed default permissions (Super Admin only)
 *     description: |
 *       Initialize the system with 85+ default permissions across all modules.
 *       This should be run once during initial setup.
 *       Safe to run multiple times - will skip existing permissions.
 *     responses:
 *       201:
 *         description: Permissions seeded successfully
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
 *                   example: Default permissions seeded successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     created:
 *                       type: integer
 *                       example: 85
 *                     failed:
 *                       type: integer
 *                       example: 0
 *                     permissions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Permission'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */

/**
 * @swagger
 * /permissions/bulk:
 *   post:
 *     tags:
 *       - Permissions
 *     summary: Bulk create permissions (Super Admin only)
 *     description: Create multiple permissions at once
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permissions
 *             properties:
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - module
 *                     - action
 *                     - code
 *                   properties:
 *                     module:
 *                       type: string
 *                     action:
 *                       type: string
 *                     code:
 *                       type: string
 *                     description:
 *                       type: string
 *     responses:
 *       201:
 *         description: Permissions created successfully
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */

/**
 * @swagger
 * /permissions/modules:
 *   get:
 *     tags:
 *       - Permissions
 *     summary: Get all modules
 *     description: Retrieve a list of all unique permission modules
 *     responses:
 *       200:
 *         description: Modules retrieved successfully
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     modules:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: [attendance, leave, payroll, employee, expense]
 */

/**
 * @swagger
 * /permissions/actions:
 *   get:
 *     tags:
 *       - Permissions
 *     summary: Get all actions
 *     description: Retrieve a list of all unique permission actions
 *     responses:
 *       200:
 *         description: Actions retrieved successfully
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     actions:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: [create, read, update, delete, approve]
 */

/**
 * @swagger
 * /permissions/by-module:
 *   get:
 *     tags:
 *       - Permissions
 *     summary: Get permissions by module
 *     description: Retrieve all permissions for a specific module
 *     parameters:
 *       - in: query
 *         name: module
 *         required: true
 *         schema:
 *           type: string
 *         description: Module name (e.g., payroll, attendance)
 *     responses:
 *       200:
 *         description: Permissions retrieved successfully
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
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Permission'
 */

/**
 * @swagger
 * /permissions/{id}:
 *   put:
 *     tags:
 *       - Permissions
 *     summary: Update permission (Super Admin only)
 *     description: Update an existing permission
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               module:
 *                 type: string
 *               action:
 *                 type: string
 *               code:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Permission updated successfully
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   delete:
 *     tags:
 *       - Permissions
 *     summary: Delete permission (Super Admin only)
 *     description: |
 *       Delete a permission. Cannot delete if the permission is assigned to any roles.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Permission deleted successfully
 *       400:
 *         description: Permission is assigned to roles
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

export {};
