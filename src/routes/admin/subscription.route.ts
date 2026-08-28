import { Router } from "express";
import { getSubscriptionDashboard, getSubscriptionHistory, buyBranchAddon } from "../../controllers/admin/subscription.controller";
import { validate } from "../../middleware/validate";
import { buyAddonSchema } from "../../validations/admin/subscription.validation";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin Subscription
 *   description: Admin Subscription Management
 */

/**
 * @swagger
 * /api/admin/subscription/dashboard:
 *   get:
 *     summary: Get subscription dashboard data (current plan, capacity, last recharge)
 *     tags: [Admin Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data fetched successfully
 *       404:
 *         description: No active subscription found
 */
router.get("/dashboard", getSubscriptionDashboard);

/**
 * @swagger
 * /api/admin/subscription/history:
 *   get:
 *     summary: Get subscription recharge history
 *     tags: [Admin Subscription]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: History fetched successfully
 */
router.get("/history", getSubscriptionHistory);

/**
 * @swagger
 * /api/admin/subscription/addons:
 *   post:
 *     summary: Purchase additional branch slots
 *     tags: [Admin Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - additionalSlots
 *               - paymentMethod
 *             properties:
 *               additionalSlots:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *                 enum: [Credit Card, UPI, NetBanking, Cash]
 *     responses:
 *       200:
 *         description: Addon purchased successfully
 */
router.post("/addons", validate(buyAddonSchema), buyBranchAddon);

export default router;
