import { Router } from "express";
import { getAllManagers, createManager, updateManager, deleteManager } from "../../controllers/super-admin/managers.controller";


const router = Router();

/**
 * @swagger
 * tags:
 *   name: Super Admin Managers
 *   description: Manage system managers
 */

/**
 * @swagger
 * /api/super-admin/managers:
 *   get:
 *     summary: Get all managers
 *     tags: [Super Admin Managers]
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
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of managers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Managers fetched successfully." }
 *                 data: { type: array, items: { type: object } }
 *                 total: { type: integer }
 *                 page: { type: integer }
 *                 totalPages: { type: integer }
 *       401:
 *         $ref: '#/components/responses/401'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.get("/", getAllManagers);

/**
 * @swagger
 * /api/super-admin/managers:
 *   post:
 *     summary: Create a new manager
 *     tags: [Super Admin Managers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: "Manager Name" }
 *               email: { type: string, example: "manager@example.com" }
 *               phoneNumber: { type: string, example: "9876543210" }
 *               password: { type: string, example: "password123" }
 *               roleId: { type: string, example: "64a2b2..." }
 *               canLoginAdmin: { type: boolean, example: true }
 *     responses:
 *       201:
 *         description: Manager created
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       409:
 *         description: Conflict (Email/Phone exists)
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.post("/", createManager);

/**
 * @swagger
 * /api/super-admin/managers/{id}:
 *   put:
 *     summary: Update a manager
 *     tags: [Super Admin Managers]
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
 *               name: { type: string, example: "Updated Manager Name" }
 *               email: { type: string, example: "updated@example.com" }
 *               phoneNumber: { type: string, example: "9876543211" }
 *               roleId: { type: string, example: "64a2b2..." }
 *               canLoginAdmin: { type: boolean, example: true }
 *               isActive: { type: boolean, example: true }
 *     responses:
 *       200:
 *         description: Manager updated
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.put("/:id", updateManager);

/**
 * @swagger
 * /api/super-admin/managers/{id}:
 *   delete:
 *     summary: Delete a manager
 *     tags: [Super Admin Managers]
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
 *         description: Manager deleted
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.delete("/:id", deleteManager);

export default router;
