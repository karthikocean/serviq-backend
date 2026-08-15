import { Router } from "express";
import { getAllSubscriptions, assignSubscription, updateSubscription, deleteSubscription } from "../../controllers/super-admin/subscription.controller";


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

export default router;
