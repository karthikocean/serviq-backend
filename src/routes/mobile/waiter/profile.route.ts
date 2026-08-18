import { Router } from "express";
import { getProfile } from "../../../controllers/mobile/waiter/profile.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Waiter Profile
 *   description: Waiter App profile endpoints
 */

/**
 * @swagger
 * /api/mobile/waiter/profile:
 *   get:
 *     summary: Get waiter profile
 *     tags: [Waiter Profile]
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
