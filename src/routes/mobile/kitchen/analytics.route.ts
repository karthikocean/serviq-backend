import { Router } from "express";
import { getAnalytics } from "../../../controllers/mobile/kitchen/analytics.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Kitchen Analytics
 *   description: Kitchen Station analytics endpoints
 */

/**
 * @swagger
 * /api/mobile/kitchen/analytics:
 *   get:
 *     summary: Fetch performance stats
 *     tags: [Kitchen Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics data fetched
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/", getAnalytics);

export default router;
