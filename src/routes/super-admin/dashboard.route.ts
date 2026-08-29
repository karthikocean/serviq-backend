import { Router } from "express";
import { getMetrics } from "../../controllers/super-admin/dashboard.controller";

const router = Router();

/**
 * @swagger
 * /api/super-admin/dashboard/metrics:
 *   get:
 *     summary: Get dashboard metrics
 *     tags: [Super Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard metrics
 *       500:
 *         description: Internal server error
 */
router.get("/metrics", getMetrics);

export default router;
