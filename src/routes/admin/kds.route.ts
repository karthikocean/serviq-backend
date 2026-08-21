import { Router } from "express";
import { 
  getKdsOrders, 
  updateItemStatus, 
  updateOrderStatus 
} from "../../controllers/admin/kds.controller";
import { checkBranchAccess, checkSubscriptionFeature } from "../../middleware/rbacMiddleware";
import { validate } from "../../middleware/validate";
import { 
  updateKdsItemStatusSchema, 
  updateKdsOrderStatusSchema 
} from "../../validations/admin/kds.validation";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin KDS
 *   description: Kitchen Display System operations
 */

/**
 * @swagger
 * /api/admin/kds:
 *   get:
 *     summary: Get active KDS orders
 *     tags: [Admin KDS]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active orders for kitchen
 */
router.get("/", checkBranchAccess, checkSubscriptionFeature("ORDER"), getKdsOrders);

/**
 * @swagger
 * /api/admin/kds/{orderId}/items/{itemId}:
 *   put:
 *     summary: Update specific item status
 *     tags: [Admin KDS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
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
 *               status:
 *                 type: string
 *                 enum: [new, preparing, ready]
 *     responses:
 *       200:
 *         description: Item status updated
 */
router.put("/:orderId/items/:itemId", checkBranchAccess, checkSubscriptionFeature("ORDER"), validate(updateKdsItemStatusSchema), updateItemStatus);

/**
 * @swagger
 * /api/admin/kds/{orderId}/status:
 *   put:
 *     summary: Mark entire order as ready
 *     tags: [Admin KDS]
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
 *                 enum: [ready, done]
 *     responses:
 *       200:
 *         description: Order marked ready
 */
router.put("/:orderId/status", checkBranchAccess, checkSubscriptionFeature("ORDER"), validate(updateKdsOrderStatusSchema), updateOrderStatus);

export default router;
