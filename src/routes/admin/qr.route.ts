import { Router } from "express";
import { getQrCodes, generateQrCode, assignQrCode, revokeQrCode, deleteQrCode } from "../../controllers/admin/qr.controller";
import { checkBranchAccess, checkSubscriptionFeature, checkPermission } from "../../middleware/rbacMiddleware";


const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin QR Codes
 *   description: Manage restaurant table QR codes
 */

/**
 * @swagger
 * /api/admin/qr:
 *   get:
 *     summary: Get all QR codes
 *     tags: [Admin QR Codes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of QR codes
 */
router.get("/", checkBranchAccess, checkSubscriptionFeature("QR"), checkPermission("QR", "canView"), getQrCodes);

/**
 * @swagger
 * /api/admin/qr:
 *   post:
 *     summary: Generate a new QR code
 *     tags: [Admin QR Codes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tableId:
 *                 type: string
 *     responses:
 *       201:
 *         description: QR code generated
 *       401:
 *         $ref: '#/components/responses/401'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.post("/", checkBranchAccess, checkSubscriptionFeature("QR"), checkPermission("QR", "canCreate"), generateQrCode);

/**
 * @swagger
 * /api/admin/qr/assign:
 *   post:
 *     summary: Assign QR code to a table
 *     tags: [Admin QR Codes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               qrCodeId: { type: string, example: "QR-101" }
 *               tableId: { type: string, example: "T-01" }
 *     responses:
 *       200:
 *         description: QR code assigned
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.post("/assign", checkBranchAccess, checkSubscriptionFeature("QR"), checkPermission("QR", "canEdit"), assignQrCode);

/**
 * @swagger
 * /api/admin/qr/revoke:
 *   post:
 *     summary: Revoke a QR code
 *     tags: [Admin QR Codes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               qrCodeId: { type: string, example: "QR-101" }
 *     responses:
 *       200:
 *         description: QR code revoked
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.post("/revoke", checkBranchAccess, checkSubscriptionFeature("QR"), checkPermission("QR", "canEdit"), revokeQrCode);

/**
 * @swagger
 * /api/admin/qr/{id}:
 *   delete:
 *     summary: Delete a QR code
 *     tags: [Admin QR Codes]
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
 *         description: QR code deleted
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.delete("/:id", checkBranchAccess, checkSubscriptionFeature("QR"), checkPermission("QR", "canDelete"), deleteQrCode);

export default router;
