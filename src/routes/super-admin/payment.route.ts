import { Router } from "express";
import {
    getPayments,
    getPaymentSummary,
    getPaymentDetails,
    recordPayment,
    updatePaymentStatus,
    deletePayment,
    downloadReceipt
} from "../../controllers/super-admin/payment.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Super Admin Payments
 *   description: Manage restaurant subscription/addon payments & receipts
 */

/**
 * @swagger
 * /api/super-admin/payments/summary:
 *   get:
 *     summary: Get payment summary metrics (total revenue, pending payments, status counts)
 *     tags: [Super Admin Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment summary fetched successfully
 */
router.get("/summary", getPaymentSummary);
router.get("/stats", getPaymentSummary);

/**
 * @swagger
 * /api/super-admin/payments:
 *   get:
 *     summary: Get all payments with optional filtering and pagination
 *     tags: [Super Admin Payments]
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by restaurant name or transaction ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [All, Pending, Paid, Failed, Refunded, Waived]
 *           default: All
 *         description: Filter by payment status
 *     responses:
 *       200:
 *         description: Payments fetched successfully
 *       401:
 *         $ref: '#/components/responses/401'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.get("/", getPayments);

/**
 * @swagger
 * /api/super-admin/payments:
 *   post:
 *     summary: Record a new payment manually for a restaurant subscription
 *     tags: [Super Admin Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Payment recorded successfully
 */
router.post("/", recordPayment);

/**
 * @swagger
 * /api/super-admin/payments/{id}:
 *   get:
 *     summary: Get single payment details
 *     tags: [Super Admin Payments]
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
 *         description: Payment details fetched successfully
 */
router.get("/:id", getPaymentDetails);

/**
 * @swagger
 * /api/super-admin/payments/{id}/status:
 *   put:
 *     summary: Update payment status or payment details
 *     tags: [Super Admin Payments]
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
 *         description: Payment updated successfully
 */
router.put("/:id/status", updatePaymentStatus);
router.put("/:id", updatePaymentStatus);

/**
 * @swagger
 * /api/super-admin/payments/{id}/receipt:
 *   get:
 *     summary: Download payment receipt as PDF
 *     tags: [Super Admin Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The payment ID
 *     responses:
 *       200:
 *         description: PDF file of the receipt
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid payment ID
 *       404:
 *         description: Payment not found
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.get("/:id/receipt", downloadReceipt);

/**
 * @swagger
 * /api/super-admin/payments/{id}:
 *   delete:
 *     summary: Delete payment record
 *     tags: [Super Admin Payments]
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
 *         description: Payment record deleted successfully
 */
router.delete("/:id", deletePayment);

export default router;
