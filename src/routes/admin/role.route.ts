import { Router } from "express";
import { getRoles, getRole, createRole, updateRole, deleteRole, seedDefaultRoles } from "../../controllers/admin/role.controller";
import { protectAdmin, restrictTo } from "../../middleware/authMiddleware";
import { validate } from "../../middleware/validate";
import { updateRolePermissionsSchema, createRoleSchema } from "../../validations/admin/role.validation";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin Roles & Permissions
 *   description: Administrative roles and permissions management API
 */

router.use(protectAdmin);

/**
 * @swagger
 * /api/admin/roles-permissions:
 *   get:
 *     summary: Retrieves roles with permissions matrix, status, search, and user counts.
 *     tags: [Admin Roles & Permissions]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by role name or code
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Active, Inactive, ALL]
 *         description: Filter by status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roles fetched successfully
 */
router.get("/", getRoles);

/**
 * @swagger
 * /api/admin/roles-permissions/seed:
 *   post:
 *     summary: Seeds default system roles for the restaurant.
 *     tags: [Admin Roles & Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Default roles seeded successfully
 */
router.post("/seed", seedDefaultRoles);

/**
 * @swagger
 * /api/admin/roles-permissions/{id}:
 *   get:
 *     summary: Retrieves a specific role by ID with permissions matrix.
 *     tags: [Admin Roles & Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role fetched successfully
 *       404:
 *         description: Role not found
 */
router.get("/:id", getRole);

/**
 * @swagger
 * /api/admin/roles-permissions:
 *   post:
 *     summary: Creates a new custom role with permissions matrix and access level.
 *     tags: [Admin Roles & Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roleName
 *             properties:
 *               roleName:
 *                 type: string
 *               adminAccess:
 *                 type: boolean
 *               isActive:
 *                 type: boolean
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive]
 *               permissions:
 *                 type: object
 *     responses:
 *       201:
 *         description: Role created successfully
 *       409:
 *         description: Role name already exists
 */
router.post("/", validate(createRoleSchema), createRole);

/**
 * @swagger
 * /api/admin/roles-permissions/{id}:
 *   put:
 *     summary: Updates permissions, access level, status, or role name.
 *     tags: [Admin Roles & Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roleName:
 *                 type: string
 *               adminAccess:
 *                 type: boolean
 *               isActive:
 *                 type: boolean
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive]
 *               permissions:
 *                 type: object
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       404:
 *         description: Role not found
 *       409:
 *         description: Role name already exists or system role rename restriction
 */
router.put("/:id", validate(updateRolePermissionsSchema), updateRole);

/**
 * @swagger
 * /api/admin/roles-permissions/{id}:
 *   delete:
 *     summary: Deletes a role (with system default & user assignment safeguards).
 *     tags: [Admin Roles & Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *       403:
 *         description: Cannot delete default system roles
 *       409:
 *         description: Role is assigned to active users
 */
router.delete("/:id", deleteRole);

export default router;
