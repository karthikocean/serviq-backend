import { Router } from "express";
import { getSubscriptionDashboard, getSubscriptionHistory, buyBranchAddon, renewPlan, upgradePlan } from "../../controllers/admin/subscription.controller";
import { validate } from "../../middleware/validate";
import { buyAddonSchema, renewPlanSchema, upgradePlanSchema } from "../../validations/admin/subscription.validation";

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

/**
 * @swagger
 * /api/admin/subscription/renew:
 *   post:
 *     summary: Renew current subscription plan
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
 *               - paymentMethod
 *             properties:
 *               billingCycle:
 *                 type: string
 *                 enum: [Monthly, Annually]
 *               paymentMethod:
 *                 type: string
 *               couponCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Plan renewed successfully
 */
router.post("/renew", validate(renewPlanSchema), renewPlan);

/**
 * @swagger
 * /api/admin/subscription/upgrade:
 *   post:
 *     summary: Upgrade / Change subscription plan
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
 *               - newPlanId
 *               - paymentMethod
 *             properties:
 *               newPlanId:
 *                 type: string
 *               billingCycle:
 *                 type: string
 *                 enum: [Monthly, Annually]
 *               paymentMethod:
 *                 type: string
 *     responses:
 *       200:
 *         description: Plan upgraded successfully
 */
router.post("/upgrade", validate(upgradePlanSchema), upgradePlan);

export default router;
