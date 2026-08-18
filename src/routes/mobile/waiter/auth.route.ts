import { Router } from "express";
import { login, logout } from "../../../controllers/mobile/waiter/auth.controller";
import { protectMobile } from "../../../middleware/authMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Waiter Auth
 *   description: Waiter App authentication endpoints
 */

/**
 * @swagger
 * /api/mobile/waiter/auth/login:
 *   post:
 *     summary: Waiter login
 *     tags: [Waiter Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumber: { type: string, example: "9876543210" }
 *               password: { type: string, example: "password123" }
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Account inactive or not a waiter
 *       500:
 *         description: Server error
 */
router.post("/login", login);

/**
 * @swagger
 * /api/mobile/waiter/auth/logout:
 *   post:
 *     summary: Logout waiter
 *     tags: [Waiter Auth]
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
