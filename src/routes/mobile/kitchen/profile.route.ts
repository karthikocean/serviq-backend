import { Router } from "express";
import { getProfile } from "../../../controllers/mobile/kitchen/profile.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Kitchen Profile
 *   description: Kitchen Station profile endpoints
 */

/**
 * @swagger
 * /api/mobile/kitchen/profile:
 *   get:
 *     summary: Get kitchen station profile
 *     tags: [Kitchen Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile fetched successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/", getProfile);

export default router;
