import { Router } from "express";
import { getActiveOrders, getOrderHistory, createOrder, addItemsToOrder, updateOrderStatus, generateBill, checkoutOrder } from "../../../controllers/mobile/waiter/order.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Waiter Orders
 *   description: Waiter App order management endpoints
 */

/**
 * @swagger
 * /api/mobile/waiter/orders:
 *   get:
 *     summary: Get active orders
 *     tags: [Waiter Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active orders
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/", getActiveOrders);

/**
 * @swagger
 * /api/mobile/waiter/orders:
 *   post:
 *     summary: Create a new order (KOT)
 *     tags: [Waiter Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tableId: { type: string, example: "60d5ecb8b392d7001f3e9b11" }
 *               items: 
 *                 type: array
 *                 items: 
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     qty: { type: number }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Order created
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.post("/", createOrder);

/**
 * @swagger
 * /api/mobile/waiter/orders/history:
 *   get:
 *     summary: Get order history
 *     tags: [Waiter Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *         description: Filter orders by date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: List of past orders
 *       500:
 *         description: Server error
 */
router.get("/history", getOrderHistory);

/**
 * @swagger
 * /api/mobile/waiter/orders/{id}/items:
 *   post:
 *     summary: Add items to an existing order
 *     tags: [Waiter Orders]
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
 *               items: 
 *                 type: array
 *                 items: 
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     qty: { type: number }
 *     responses:
 *       200:
 *         description: Items added successfully
 *       500:
 *         description: Server error
 */
router.post("/:id/items", addItemsToOrder);

/**
 * @swagger
 * /api/mobile/waiter/orders/{id}/status:
 *   patch:
 *     summary: Update order status
 *     tags: [Waiter Orders]
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
 *               status: { type: string, example: "DELIVERED" }
 *     responses:
 *       200:
 *         description: Order status updated
 *       500:
 *         description: Server error
 */
router.patch("/:id/status", updateOrderStatus);

/**
 * @swagger
 * /api/mobile/waiter/orders/{id}/bill:
 *   get:
 *     summary: Generate bill for order
 *     tags: [Waiter Orders]
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
 *         description: Bill generated
 *       500:
 *         description: Server error
 */
router.get("/:id/bill", generateBill);

/**
 * @swagger
 * /api/mobile/waiter/orders/{id}/checkout:
 *   post:
 *     summary: Checkout order
 *     tags: [Waiter Orders]
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
 *               paymentMethod: { type: string, example: "CASH" }
 *     responses:
 *       200:
 *         description: Order checked out
 *       500:
 *         description: Server error
 */
router.post("/:id/checkout", checkoutOrder);

export default router;
