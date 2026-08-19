import { Router } from "express";
import { getDashboardStats } from "../../../controllers/mobile/waiter/dashboard.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Waiter Dashboard
 *   description: Waiter App dashboard endpoints
 */

/**
 * @swagger
 * /api/mobile/waiter/dashboard:
 *   get:
 *     summary: Get dashboard stats
 *     tags: [Waiter Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/", getDashboardStats);

export default router;
