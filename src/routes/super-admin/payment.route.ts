import { Router } from "express";
import { getPayments, downloadReceipt } from "../../controllers/super-admin/payment.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Super Admin Payments
 *   description: Manage restaurant subscription/addon payments & receipts
 */

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

export default router;
