import { Router } from "express";
import { 
  getBill, 
  applyBillDiscount, 
  payBill 
} from "../../controllers/admin/billing.controller";
import { checkBranchAccess, checkSubscriptionFeature, checkPermission } from "../../middleware/rbacMiddleware";
import { validate } from "../../middleware/validate";
import { 
  applyDiscountSchema, 
  processPaymentSchema 
} from "../../validations/admin/billing.validation";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin Billing
 *   description: Manage billing and payments
 */

/**
 * @swagger
 * /api/admin/billing/{orderId}:
 *   get:
 *     summary: Get bill details
 *     tags: [Admin Billing]
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
 *         description: Bill details
 */
router.get("/:orderId", checkBranchAccess, checkSubscriptionFeature("ORDER"), checkPermission("ORDER", "view"), getBill);

/**
 * @swagger
 * /api/admin/billing/{orderId}/discount:
 *   post:
 *     summary: Apply discount
 *     tags: [Admin Billing]
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
 *               discount: { type: number }
 *     responses:
 *       200:
 *         description: Discount applied
 */
router.post("/:orderId/discount", checkBranchAccess, checkSubscriptionFeature("ORDER"), checkPermission("ORDER", "edit"), validate(applyDiscountSchema), applyBillDiscount);

/**
 * @swagger
 * /api/admin/billing/{orderId}/pay:
 *   post:
 *     summary: Process payment
 *     tags: [Admin Billing]
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
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, card, upi]
 *     responses:
 *       200:
 *         description: Payment processed
 */
router.post("/:orderId/pay", checkBranchAccess, checkSubscriptionFeature("ORDER"), checkPermission("ORDER", "edit"), validate(processPaymentSchema), payBill);

export default router;
