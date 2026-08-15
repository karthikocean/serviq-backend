import { Router } from "express";
import { register, login, logout } from "../../controllers/mobile/auth.controller";
import { protectAdmin } from "../../middleware/authMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Mobile Auth
 *   description: Mobile app authentication endpoints
 */

/**
 * @swagger
 * /api/mobile/auth/register:
 *   post:
 *     summary: Register mobile user
 *     tags: [Mobile Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: "John Doe" }
 *               phoneNumber: { type: string, example: "9876543210" }
 *               password: { type: string, example: "password123" }
 *               email: { type: string, example: "john@example.com" }
 *     responses:
 *       201:
 *         description: User registered
 *       400:
 *         $ref: '#/components/responses/400'
 *       409:
 *         description: Phone number already registered
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.post("/register", register);

/**
 * @swagger
 * /api/mobile/auth/login:
 *   post:
 *     summary: Mobile user login
 *     tags: [Mobile Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "9876543210"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 user: 
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     name: { type: string }
 *                     phoneNumber: { type: string }
 *                     email: { type: string }
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       403:
 *         description: Account is inactive
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.post("/login", login);

/**
 * @swagger
 * /api/mobile/auth/logout:
 *   post:
 *     summary: Logout mobile user
 *     tags: [Mobile Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         $ref: '#/components/responses/401'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.post("/logout", protectAdmin, logout);

export default router;
