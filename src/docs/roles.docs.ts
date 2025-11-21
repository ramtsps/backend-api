/**
 * @swagger
 * /roles:
 *   get:
 *     tags:
 *       - Roles
 *     summary: Get all roles
 *     description: |
 *       Retrieve a paginated list of roles.
 *       Company admins see only their company's roles.
 *       Super admins can see all roles or filter by company.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by company (Super Admin only)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name, displayName, or description
 *       - in: query
 *         name: isSystem
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Filter system roles
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Roles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */

/**
 * @swagger
 * /roles/{id}:
 *   get:
 *     tags:
 *       - Roles
 *     summary: Get role by ID
 *     description: Retrieve a single role with all its permissions and assigned users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Role retrieved successfully
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
 *                   allOf:
 *                     - $ref: '#/components/schemas/Role'
 *                     - type: object
 *                       properties:
 *                         rolePermissions:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               permission:
 *                                 $ref: '#/components/schemas/Permission'
 *                         userRoles:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               user:
 *                                 $ref: '#/components/schemas/User'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /roles:
 *   post:
 *     tags:
 *       - Roles
 *     summary: Create role (Admin)
 *     description: |
 *       Create a new custom role for your company.
 *       Role names must be lowercase with underscores (e.g., sales_manager).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRoleRequest'
 *     responses:
 *       201:
 *         description: Role created successfully
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
 *                   $ref: '#/components/schemas/Role'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       409:
 *         description: Role name already exists for this company
 */

/**
 * @swagger
 * /roles/seed:
 *   post:
 *     tags:
 *       - Roles
 *     summary: Seed default roles (Super Admin only)
 *     description: |
 *       Initialize a company with 6 default system roles:
 *       - Administrator (Full access)
 *       - HR Manager (Employee, attendance, leave, performance)
 *       - Finance Manager (Payroll, expenses, invoicing)
 *       - Project Manager (Projects, tasks, timesheets)
 *       - Team Lead (Team tasks, approvals)
 *       - Employee (Self-service operations)
 *       
 *       Safe to run multiple times - will skip existing roles.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *             properties:
 *               companyId:
 *                 type: string
 *                 format: uuid
 *                 description: Company ID to seed roles for
 *     responses:
 *       201:
 *         description: Roles seeded successfully
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
 *                     created:
 *                       type: integer
 *                       example: 6
 *                     roles:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Role'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */

/**
 * @swagger
 * /roles/{id}:
 *   put:
 *     tags:
 *       - Roles
 *     summary: Update role (Admin)
 *     description: |
 *       Update an existing role.
 *       System roles can only be modified by Super Admin.
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
 *               name:
 *                 type: string
 *               displayName:
 *                 type: string
 *               description:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   delete:
 *     tags:
 *       - Roles
 *     summary: Delete role (Admin)
 *     description: |
 *       Delete a role. Cannot delete if:
 *       - Role is a system role (unless Super Admin)
 *       - Role is assigned to any users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *       400:
 *         description: Role is assigned to users
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /roles/{id}/clone:
 *   post:
 *     tags:
 *       - Roles
 *     summary: Clone role (Admin)
 *     description: |
 *       Clone an existing role with all its permissions.
 *       Optionally clone to a different company.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Source role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - displayName
 *             properties:
 *               name:
 *                 type: string
 *                 example: custom_sales_manager
 *               displayName:
 *                 type: string
 *                 example: Custom Sales Manager
 *               companyId:
 *                 type: string
 *                 format: uuid
 *                 description: Target company ID (optional, defaults to same company)
 *     responses:
 *       201:
 *         description: Role cloned successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         description: Role name already exists in target company
 */

/**
 * @swagger
 * /roles/{id}/permissions:
 *   get:
 *     tags:
 *       - Roles
 *     summary: Get role permissions
 *     description: Retrieve all permissions assigned to a role
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *                   type: object
 *                   properties:
 *                     permissions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Permission'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   post:
 *     tags:
 *       - Roles
 *     summary: Assign permissions to role (Admin)
 *     description: |
 *       Assign multiple permissions to a role.
 *       Skips permissions that are already assigned.
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
 *             required:
 *               - permissionIds
 *             properties:
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 example: ["perm-uuid-1", "perm-uuid-2", "perm-uuid-3"]
 *     responses:
 *       200:
 *         description: Permissions assigned successfully
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
 *                     assignedCount:
 *                       type: integer
 *                       example: 3
 *                     alreadyExisted:
 *                       type: integer
 *                       example: 0
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /roles/{id}/permissions/{permissionId}:
 *   delete:
 *     tags:
 *       - Roles
 *     summary: Remove permission from role (Admin)
 *     description: Remove a specific permission from a role
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role ID
 *       - in: path
 *         name: permissionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Permission ID
 *     responses:
 *       200:
 *         description: Permission removed successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /roles/{id}/users:
 *   get:
 *     tags:
 *       - Roles
 *     summary: Get users by role
 *     description: Retrieve all users assigned to a specific role
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   post:
 *     tags:
 *       - Roles
 *     summary: Assign role to user (Admin/HR)
 *     description: |
 *       Assign a role to a user.
 *       User must belong to the same company as the role.
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
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Role assigned to user successfully
 *       400:
 *         description: User and role must belong to the same company
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         description: Role already assigned to this user
 */

/**
 * @swagger
 * /roles/{id}/users/{userId}:
 *   delete:
 *     tags:
 *       - Roles
 *     summary: Remove role from user (Admin/HR)
 *     description: Remove a role assignment from a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: Role removed from user successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

export {};
