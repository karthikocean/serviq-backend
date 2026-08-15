import { Router } from "express";
import { getDashboard } from "../../controllers/admin/dashboard.controller";


const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin Dashboard
 *   description: Dashboard statistics
 */

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get Dashboard Statistics
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Dashboard data fetched." }
 *                 data:
 *                   type: object
 *                   properties:
 *                     message: { type: string, example: "Welcome to Admin Dashboard" }
 *                     adminId: { type: string, example: "64a2b2..." }
 *       401:
 *         $ref: '#/components/responses/401'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.get("/", getDashboard);

export default router;
