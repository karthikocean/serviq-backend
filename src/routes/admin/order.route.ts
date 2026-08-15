import { Router } from "express";
import { getOrders, createOrder, updateOrder, deleteOrder, payBill } from "../../controllers/admin/order.controller";
import { checkBranchAccess, checkSubscriptionFeature, checkPermission } from "../../middleware/rbacMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin Orders
 *   description: Manage restaurant orders and billing
 */

/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     summary: Get all orders
 *     tags: [Admin Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of orders
 */
router.get("/", checkBranchAccess, checkSubscriptionFeature("ORDER"), checkPermission("ORDER", "canView"), getOrders);

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
 *               table: { type: string, example: "Table 1" }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     menuItem: { type: string, example: "Margherita Pizza" }
 *                     qty: { type: integer, example: 2 }
 *                     price: { type: number, example: 299 }
 *               notes: { type: string, example: "Extra spicy" }
 *               waiter: { type: string, example: "John" }
 *     responses:
 *       201:
 *         description: Order created
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.post("/", checkBranchAccess, checkSubscriptionFeature("ORDER"), checkPermission("ORDER", "canCreate"), createOrder);



/**
 * @swagger
 * /api/admin/orders/{id}:
 *   put:
 *     summary: Update an order
 *     tags: [Admin Orders]
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
 *               status: { type: string, example: "preparing" }
 *               billingStatus: { type: string, example: "unpaid" }
 *               waiter: { type: string, example: "Mike" }
 *               notes: { type: string, example: "Less spicy" }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     menuItem: { type: string, example: "Margherita Pizza" }
 *                     qty: { type: integer, example: 1 }
 *                     price: { type: number, example: 299 }
 *     responses:
 *       200:
 *         description: Order updated
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.put("/:id", checkBranchAccess, checkSubscriptionFeature("ORDER"), checkPermission("ORDER", "canEdit"), updateOrder);

/**
 * @swagger
 * /api/admin/orders/{id}:
 *   delete:
 *     summary: Delete an order
 *     tags: [Admin Orders]
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
 *         description: Order deleted
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.delete("/:id", checkBranchAccess, checkSubscriptionFeature("ORDER"), checkPermission("ORDER", "canDelete"), deleteOrder);

/**
 * @swagger
 * /api/admin/orders/pay:
 *   post:
 *     summary: Pay a bill for an order
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
 *               orderId:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bill paid successfully
 */
router.post("/pay", checkBranchAccess, checkSubscriptionFeature("ORDER"), checkPermission("ORDER", "canEdit"), payBill);

export default router;
