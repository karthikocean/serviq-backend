import { Router } from "express";
import {
  getAllTables,
  getTable,
  createNewTable,
  updateTableDetails,
  deleteTableData,
  generateQrCodes,
  assignWaiter,
  getNextTableId
} from "../../controllers/admin/table.controller";
import { checkBranchAccess, checkSubscriptionFeature, checkPermission } from "../../middleware/rbacMiddleware";
import { validate } from "../../middleware/validate";
import {
  createTableSchema,
  updateTableSchema,
  qrGenerationSchema,
  assignWaiterSchema
} from "../../validations/admin/table.validation";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin Tables & QR
 *   description: Manage restaurant tables and generate QR codes
 */

/**
 * @swagger
 * /api/admin/tables:
 *   get:
 *     summary: Get all tables
 *     tags: [Admin Tables & QR]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of tables
 */
router.get("/", checkBranchAccess, checkSubscriptionFeature("TABLE_QR"), checkPermission("TABLE_QR", "view"), getAllTables);

/**
 * @swagger
 * /api/admin/tables/next-id:
 *   get:
 *     summary: Get the next auto-generated table ID
 *     tags: [Admin Tables & QR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Next table ID
 */
router.get("/next-id", checkBranchAccess, checkSubscriptionFeature("TABLE_QR"), checkPermission("TABLE_QR", "view"), getNextTableId);

/**
 * @swagger
 * /api/admin/tables:
 *   post:
 *     summary: Create a new table
 *     tags: [Admin Tables & QR]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tableNumber: { type: string, example: "T-01" }
 *               seatingCapacity: { type: number, example: 4 }
 *               section: { type: string, example: "Main Hall" }
 *               assignedWaiter: { type: string, example: "60d5ecb8b392d7001f3e9b11" }
 *     responses:
 *       201:
 *         description: Table created
 */
router.post("/", checkBranchAccess, checkSubscriptionFeature("TABLE_QR"), checkPermission("TABLE_QR", "add"), validate(createTableSchema), createNewTable);

/**
 * @swagger
 * /api/admin/tables/assign-waiter:
 *   put:
 *     summary: Assign a primary and/or cover waiter to selected tables
 *     tags: [Admin Tables & QR]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               waiterId: { type: string, example: "60d5ecb8b392d7001f3e9b11" }
 *               tableIds: { type: array, items: { type: string }, example: ["60d5ecb8b392d7001f3e9b12"] }
 *               coverWaiterId: { type: string, example: "60d5ecb8b392d7001f3e9b13" }
 *     responses:
 *       200:
 *         description: Waiter assigned successfully
 *       400:
 *         description: Bad request / validation error
 */
router.put("/assign-waiter", checkBranchAccess, checkSubscriptionFeature("TABLE_QR"), checkPermission("TABLE_QR", "edit"), validate(assignWaiterSchema), assignWaiter);

/**
 * @swagger
 * /api/admin/tables/{tableId}:
 *   put:
 *     summary: Update table details
 *     tags: [Admin Tables & QR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tableId
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
 *               tableNumber: { type: string, example: "T-01" }
 *               seatingCapacity: { type: number, example: 6 }
 *               section: { type: string, example: "Balcony" }
 *               assignedWaiter: { type: string, example: "60d5ecb8b392d7001f3e9b11" }
 *               status: { type: string, example: "Reserved" }
 *     responses:
 *       200:
 *         description: Table updated
 */
router.get("/:tableId", checkBranchAccess, checkSubscriptionFeature("TABLE_QR"), checkPermission("TABLE_QR", "view"), getTable);
router.patch("/:tableId", checkBranchAccess, checkSubscriptionFeature("TABLE_QR"), checkPermission("TABLE_QR", "edit"), validate(updateTableSchema), updateTableDetails);

/**
 * @swagger
 * /api/admin/tables/{tableId}:
 *   delete:
 *     summary: Delete a table
 *     tags: [Admin Tables & QR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tableId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Table deleted
 */
router.delete("/:tableId", checkBranchAccess, checkSubscriptionFeature("TABLE_QR"), checkPermission("TABLE_QR", "delete"), deleteTableData);

/**
 * @swagger
 * /api/admin/tables/generate-qr:
 *   post:
 *     summary: Generate QR codes for selected tables
 *     tags: [Admin Tables & QR]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tableIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["60d5ecb8b392d7001f3e9b11", "60d5ecb8b392d7001f3e9b12"]
 *     responses:
 *       200:
 *         description: QR codes generated successfully
 */
router.post("/generate-qr", checkBranchAccess, checkSubscriptionFeature("TABLE_QR"), checkPermission("TABLE_QR", "edit"), validate(qrGenerationSchema), generateQrCodes);

export default router;
