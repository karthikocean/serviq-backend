import { Router } from "express";
import { 
  getAllOrders, 
  getSingleOrder, 
  createNewOrder, 
  updateStatus, 
  updateItems, 
  deleteOrderRecord 
} from "../../controllers/admin/order.controller";
import { checkBranchAccess, checkSubscriptionFeature, checkPermission } from "../../middleware/rbacMiddleware";
import { validate } from "../../middleware/validate";
import { 
  createOrderSchema, 
  updateOrderStatusSchema, 
  updateOrderItemsSchema 
} from "../../validations/admin/order.validation";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin Orders
 *   description: Manage restaurant orders
 */

/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     summary: Get all orders
 *     tags: [Admin Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, preparing, ready, done]
 *     responses:
 *       200:
 *         description: List of orders
 */
router.get("/", checkBranchAccess, checkSubscriptionFeature("ORDER"), checkPermission("ORDER", "view"), getAllOrders);

/**
 * @swagger
 * /api/admin/orders/{orderId}:
 *   get:
 *     summary: Get a specific order
 *     tags: [Admin Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 */
router.get("/:orderId", checkBranchAccess, checkSubscriptionFeature("ORDER"), checkPermission("ORDER", "view"), getSingleOrder);

/**
 * @swagger
 * /api/admin/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Admin Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tableId: { type: string }
 *               waiterId: { type: string }
 *               items: 
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     menuId: { type: string }
 *                     name: { type: string }
 *                     qty: { type: number }
 *                     price: { type: number }
 *               subtotal: { type: number }
 *               tax: { type: number }
 *               total: { type: number }
 *     responses:
 *       201:
 *         description: Order created
 */
router.post("/", checkBranchAccess, checkSubscriptionFeature("ORDER"), checkPermission("ORDER", "add"), validate(createOrderSchema), createNewOrder);

/**
 * @swagger
 * /api/admin/orders/{orderId}/status:
 *   patch:
 *     summary: Update order status
 *     tags: [Admin Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
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
 *               status:
 *                 type: string
 *                 enum: [new, preparing, ready, done]
 *     responses:
 *       200:
 *         description: Order status updated
 */
router.patch("/:orderId/status", checkBranchAccess, checkSubscriptionFeature("ORDER"), checkPermission("ORDER", "edit"), validate(updateOrderStatusSchema), updateStatus);

/**
 * @swagger
 * /api/admin/orders/{orderId}/items:
 *   put:
 *     summary: Update order items and totals
 *     tags: [Admin Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Order items updated
 */
router.put("/:orderId/items", checkBranchAccess, checkSubscriptionFeature("ORDER"), checkPermission("ORDER", "edit"), validate(updateOrderItemsSchema), updateItems);

/**
 * @swagger
 * /api/admin/orders/{orderId}:
 *   delete:
 *     summary: Delete an order
 *     tags: [Admin Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order deleted
 */
router.delete("/:orderId", checkBranchAccess, checkSubscriptionFeature("ORDER"), checkPermission("ORDER", "delete"), deleteOrderRecord);

export default router;
