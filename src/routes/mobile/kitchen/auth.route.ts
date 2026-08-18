import { Router } from "express";
import { login, logout } from "../../../controllers/mobile/kitchen/auth.controller";
import { protectMobile } from "../../../middleware/authMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Kitchen Auth
 *   description: Kitchen Station authentication endpoints
 */

/**
 * @swagger
 * /api/mobile/kitchen/auth/login:
 *   post:
 *     summary: Kitchen station login
 *     tags: [Kitchen Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string, example: "grill_station_1" }
 *               password: { type: string, example: "password123" }
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Account inactive or not a kitchen station
 *       500:
 *         description: Server error
 */
router.post("/login", login);

/**
 * @swagger
 * /api/mobile/kitchen/auth/logout:
 *   post:
 *     summary: Logout kitchen station
 *     tags: [Kitchen Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/logout", protectMobile, logout);

export default router;
