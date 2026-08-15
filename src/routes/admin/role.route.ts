import { Router } from "express";
import { getRoles, updateRole } from "../../controllers/admin/role.controller";
import { protectAdmin, restrictTo } from "../../middleware/authMiddleware";
import { validate } from "../../middleware/validate";
import { updateRolePermissionsSchema } from "../../validations/admin/role.validation";

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
 * /api/admin/roles-permissions/{roleName}:
 *   put:
 *     summary: Updates module-wise granular permissions for a role.
 *     tags: [Admin Roles & Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleName
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
 *               permissions:
 *                 type: object
 *                 additionalProperties:
 *                   type: object
 *                   properties:
 *                     view:
 *                       type: boolean
 *                     add:
 *                       type: boolean
 *                     edit:
 *                       type: boolean
 *                     delete:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Permissions updated
 */
router.put("/:roleName", validate(updateRolePermissionsSchema), updateRole);

export default router;
