import { Router } from "express";
import { getAllSubscriptions, getSubscriptionHistory, getSubscriptionById, assignSubscription, updateSubscription, deleteSubscription, changePlan, purchaseAddon, renewSubscription, cancelSubscription, getAddons, createAddon, updateAddon, deleteAddon, calculateChangePlanProration } from "../../controllers/super-admin/subscription.controller";


const router = Router();

/**
 * @swagger
 * tags:
 *   name: Super Admin Subscriptions
 *   description: Manage restaurant subscriptions
 */

/**
 * @swagger
 * /api/super-admin/subscriptions:
 *   get:
 *     summary: Get all subscriptions
 *     tags: [Super Admin Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of subscriptions
 *       401:
 *         $ref: '#/components/responses/401'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.get("/", getAllSubscriptions);

/**
 * @swagger
 * /api/super-admin/subscriptions/history:
 *   get:
 *     summary: Get subscription history
 *     tags: [Super Admin Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Subscription history fetched successfully
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.get("/history", getSubscriptionHistory);

/**
 * @swagger
 * /api/super-admin/subscriptions/{id}:
 *   get:
 *     summary: Get subscription details by ID
 *     tags: [Super Admin Subscriptions]
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
 *         description: Subscription details fetched successfully
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.get("/:id", getSubscriptionById);
/**
 * @swagger
 * /api/super-admin/subscriptions:
 *   post:
 *     summary: Assign a new subscription
 *     tags: [Super Admin Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               restaurant: { type: string, example: "64a2b2..." }
 *               plan: { type: string, example: "64a2b2..." }
 *               startDate: { type: string, format: date-time, example: "2026-08-01T00:00:00Z" }
 *               endDate: { type: string, format: date-time, example: "2027-08-01T00:00:00Z" }
 *               renewalDate: { type: string, format: date-time, example: "2027-08-01T00:00:00Z" }
 *               status: { type: string, example: "Active" }
 *     responses:
 *       201:
 *         description: Subscription created
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.post("/", assignSubscription);

/**
 * @swagger
 * /api/super-admin/subscriptions/change-plan:
 *   post:
 *     summary: Change plan with prorated credit
 *     tags: [Super Admin Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               restaurantId: { type: string }
 *               newPlanId: { type: string }
 *               billingCycle: { type: string, example: "Monthly" }
 *     responses:
 *       200:
 *         description: Plan changed successfully
 */
router.post("/change-plan", changePlan);
router.post("/prorate-change-plan", calculateChangePlanProration);

/**
 * @swagger
 * /api/super-admin/subscriptions/purchase-addon:
 *   post:
 *     summary: Purchase branch addon with prorated price
 *     tags: [Super Admin Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               restaurantId: { type: string }
 *               addonId: { type: string }
 *               quantity: { type: number }
 *     responses:
 *       200:
 *         description: Addon purchased successfully
 */
router.post("/purchase-addon", purchaseAddon);

/**
 * @swagger
 * /api/super-admin/subscriptions/{id}:
 *   put:
 *     summary: Update a subscription
 *     tags: [Super Admin Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               plan: { type: string, example: "64a2b2..." }
 *               startDate: { type: string, format: date-time, example: "2026-08-01T00:00:00Z" }
 *               endDate: { type: string, format: date-time, example: "2027-08-01T00:00:00Z" }
 *               renewalDate: { type: string, format: date-time, example: "2027-08-01T00:00:00Z" }
 *               status: { type: string, example: "Inactive" }
 *               isActive: { type: boolean, example: false }
 *     responses:
 *       200:
 *         description: Subscription updated
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.put("/:id", updateSubscription);

/**
 * @swagger
 * /api/super-admin/subscriptions/{id}/renew:
 *   post:
 *     summary: Renew a subscription
 *     tags: [Super Admin Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               totalAmount: { type: number }
 *     responses:
 *       200:
 *         description: Subscription renewed successfully
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.post("/:id/renew", renewSubscription);

/**
 * @swagger
 * /api/super-admin/subscriptions/{id}/cancel:
 *   post:
 *     summary: Cancel a subscription
 *     tags: [Super Admin Subscriptions]
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
 *         description: Subscription cancelled successfully
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.post("/:id/cancel", cancelSubscription);

/**
 * @swagger
 * /api/super-admin/subscriptions/{id}:
 *   delete:
 *     summary: Delete a subscription
 *     tags: [Super Admin Subscriptions]
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
 *         description: Subscription deleted
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.delete("/:id", deleteSubscription);
router.get("/addons/all", getAddons);
router.post("/addons", createAddon);
router.put("/addons/:id", updateAddon);
router.delete("/addons/:id", deleteAddon);

export default router;
