import { Router } from "express";
import { getAvailablePlans, getPlanById } from "../../controllers/admin/subscription.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin Plans
 *   description: View available subscription plans for admin panel
 */

/**
 * @swagger
 * /api/admin/plans:
 *   get:
 *     summary: Get all active plans
 *     tags: [Admin Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of available active plans
 *       401:
 *         description: Unauthorized
 */
router.get("/", getAvailablePlans);

/**
 * @swagger
 * /api/admin/plans/{id}:
 *   get:
 *     summary: Get plan details by ID
 *     tags: [Admin Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Plan details
 *       404:
 *         description: Plan not found
 */
router.get("/:id", getPlanById);

export default router;
