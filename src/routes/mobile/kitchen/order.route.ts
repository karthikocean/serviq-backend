import { Router } from "express";
import { getActiveOrders, updateOrderStatus, updateItemStatus } from "../../../controllers/mobile/kitchen/order.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Kitchen Orders
 *   description: Kitchen Station order management endpoints
 */

/**
 * @swagger
 * /api/mobile/kitchen/orders:
 *   get:
 *     summary: Get active orders (KOTs)
 *     tags: [Kitchen Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter orders by status (NEW, COOKING, READY)
 *     responses:
 *       200:
 *         description: List of active kitchen orders
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/", getActiveOrders);

/**
 * @swagger
 * /api/mobile/kitchen/orders/{id}/status:
 *   patch:
 *     summary: Update order status
 *     tags: [Kitchen Orders]
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
 *               status: { type: string, example: "READY" }
 *     responses:
 *       200:
 *         description: Order status updated
 *       500:
 *         description: Server error
 */
router.patch("/:id/status", updateOrderStatus);

/**
 * @swagger
 * /api/mobile/kitchen/orders/{id}/items/{itemId}:
 *   patch:
 *     summary: Update specific item status in an order
 *     tags: [Kitchen Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
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
 *               status: { type: string, example: "READY" }
 *     responses:
 *       200:
 *         description: Item status updated
 *       500:
 *         description: Server error
 */
router.patch("/:id/items/:itemId", updateItemStatus);

export default router;
