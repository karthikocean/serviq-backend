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

/**
 * @swagger
 * /api/super-admin/dashboard/reports-analytics:
 *   get:
 *     summary: Get dashboard reports & analytics
 *     tags: [Super Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard reports and analytics
 *       500:
 *         description: Internal server error
 */
router.get("/reports-analytics", async (req, res, next) => {
    const { getReportsAnalytics } = await import("../../controllers/super-admin/dashboard.controller");
    return getReportsAnalytics(req, res);
});

export default router;
