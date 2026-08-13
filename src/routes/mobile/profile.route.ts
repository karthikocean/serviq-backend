import { Router } from "express";
import { getProfile, updateProfile } from "../../controllers/mobile/auth.controller";
import { protectAdmin } from "../../middleware/authMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Mobile Profile
 *   description: Mobile user profile management
 */

/**
 * @swagger
 * /api/mobile/profile:
 *   get:
 *     summary: Get mobile user profile
 *     tags: [Mobile Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile data
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.get("/", protectAdmin, getProfile);

/**
 * @swagger
 * /api/mobile/profile:
 *   put:
 *     summary: Update mobile user profile
 *     tags: [Mobile Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: "John Doe" }
 *               email: { type: string, example: "john@example.com" }
 *     responses:
 *       200:
 *         description: Profile updated
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.put("/", protectAdmin, updateProfile);

export default router;
