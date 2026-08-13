import { Router } from "express";
import { getAllRoles, createRole, updateRole, deleteRole, getAllModules } from "../../controllers/super-admin/roles.controller";


const router = Router();

/**
 * @swagger
 * tags:
 *   name: Super Admin Roles
 *   description: Manage system roles and modules
 */

/**
 * @swagger
 * /api/super-admin/roles/modules:
 *   get:
 *     summary: Get all system modules
 *     tags: [Super Admin Roles]
 *     security:
 *       - bearerAuth: []
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
 *         description: Number of modules per page
 *     responses:
 *       200:
 *         description: List of modules
 *       401:
 *         $ref: '#/components/responses/401'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.get("/modules", getAllModules);

/**
 * @swagger
 * /api/super-admin/roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Super Admin Roles]
 *     security:
 *       - bearerAuth: []
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
 *           default: 10
 *         description: Number of roles per page
 *     responses:
 *       200:
 *         description: List of roles
 *       401:
 *         $ref: '#/components/responses/401'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.get("/", getAllRoles);

/**
 * @swagger
 * /api/super-admin/roles:
 *   post:
 *     summary: Create a new role
 *     tags: [Super Admin Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roleName: { type: string, example: "Manager" }
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     module: { type: string, example: "64a2b2..." }
 *                     canRead: { type: boolean, example: true }
 *                     canWrite: { type: boolean, example: true }
 *                     canUpdate: { type: boolean, example: false }
 *                     canDelete: { type: boolean, example: false }
 *     responses:
 *       201:
 *         description: Role created
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       409:
 *         description: Role already exists
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.post("/", createRole);

/**
 * @swagger
 * /api/super-admin/roles/{id}:
 *   put:
 *     summary: Update a role
 *     tags: [Super Admin Roles]
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
 *               roleName: { type: string, example: "Senior Manager" }
 *               isActive: { type: boolean, example: true }
 *     responses:
 *       200:
 *         description: Role updated
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.put("/:id", updateRole);

/**
 * @swagger
 * /api/super-admin/roles/{id}:
 *   delete:
 *     summary: Delete a role
 *     tags: [Super Admin Roles]
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
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.delete("/:id", deleteRole);

export default router;
