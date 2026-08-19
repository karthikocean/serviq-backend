import { Router } from "express";
import { getRoles, getRole, createRole, updateRole, deleteRole } from "../../controllers/admin/role.controller";
import { protectAdmin, restrictTo } from "../../middleware/authMiddleware";
import { validate } from "../../middleware/validate";
import { updateRolePermissionsSchema, createRoleSchema } from "../../validations/admin/role.validation";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin Roles & Permissions
 *   description: Administrative roles and permissions management
 */

router.use(protectAdmin);
router.use(restrictTo("RESTAURANT_OWNER", "SUPER_ADMIN"));

/**
 * @swagger
 * /api/admin/roles-permissions:
 *   get:
 *     summary: Retrieves full permissions matrix for all system roles.
 *     tags: [Admin Roles & Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roles fetched successfully
 */
router.get("/", getRoles);

/**
 * @swagger
 * /api/admin/roles-permissions/{id}:
 *   get:
 *     summary: Retrieves a specific role by ID.
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
 */
router.get("/:id", getRole);

/**
 * @swagger
 * /api/admin/roles-permissions:
 *   post:
 *     summary: Creates a new role with permissions.
 *     tags: [Admin Roles & Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roleName:
 *                 type: string
 *               permissions:
 *                 type: object
 *     responses:
 *       201:
 *         description: Role created
 */
router.post("/", validate(createRoleSchema), createRole);

/**
 * @swagger
 * /api/admin/roles-permissions/{id}:
 *   put:
 *     summary: Updates module-wise granular permissions for a role.
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
 *               permissions:
 *                 type: object
 *     responses:
 *       200:
 *         description: Permissions updated
 */
router.put("/:id", validate(updateRolePermissionsSchema), updateRole);

/**
 * @swagger
 * /api/admin/roles-permissions/{id}:
 *   delete:
 *     summary: Deletes a role (soft delete).
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
 *         description: Role deleted
 */
router.delete("/:id", deleteRole);

export default router;
