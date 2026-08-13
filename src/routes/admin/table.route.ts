import { Router } from "express";
import { createTable, getTables, getTable, updateTable, deleteTable } from "../../controllers/admin/table.controller";
import { checkBranchAccess, checkSubscriptionFeature, checkPermission } from "../../middleware/rbacMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin Tables
 *   description: Manage dining tables
 */

/**
 * @swagger
 * /api/admin/tables:
 *   post:
 *     summary: Create a new table
 *     tags: [Admin Tables]
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
 *               seatingCapacity: { type: integer, example: 4 }
 *     responses:
 *       201:
 *         description: Table created
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       409:
 *         description: Table already exists
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.post("/", checkBranchAccess, checkSubscriptionFeature("TABLE"), checkPermission("TABLE", "canCreate"), createTable);

/**
 * @swagger
 * /api/admin/tables:
 *   get:
 *     summary: Get all tables
 *     tags: [Admin Tables]
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
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of tables
 *       401:
 *         $ref: '#/components/responses/401'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.get("/", checkBranchAccess, checkSubscriptionFeature("TABLE"), checkPermission("TABLE", "canView"), getTables);

/**
 * @swagger
 * /api/admin/tables/{id}:
 *   get:
 *     summary: Get a specific table
 *     tags: [Admin Tables]
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
 *         description: Table details
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.get("/:id", checkBranchAccess, checkSubscriptionFeature("TABLE"), checkPermission("TABLE", "canView"), getTable);

/**
 * @swagger
 * /api/admin/tables/{id}:
 *   put:
 *     summary: Update a table
 *     tags: [Admin Tables]
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
 *               tableNumber: { type: string, example: "T-02" }
 *               seatingCapacity: { type: integer, example: 6 }
 *               status: { type: string, example: "Available" }
 *               isActive: { type: boolean, example: true }
 *     responses:
 *       200:
 *         description: Table updated
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       409:
 *         description: Table already exists
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.put("/:id", checkBranchAccess, checkSubscriptionFeature("TABLE"), checkPermission("TABLE", "canEdit"), updateTable);

/**
 * @swagger
 * /api/admin/tables/{id}:
 *   patch:
 *     summary: Partially update a table
 *     tags: [Admin Tables]
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
 *               status: { type: string, example: "Occupied" }
 *     responses:
 *       200:
 *         description: Table patched
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.patch("/:id", updateTable);

/**
 * @swagger
 * /api/admin/tables/{id}:
 *   delete:
 *     summary: Delete a table
 *     tags: [Admin Tables]
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
 *         description: Table deleted
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.delete("/:id", checkBranchAccess, checkSubscriptionFeature("TABLE"), checkPermission("TABLE", "canDelete"), deleteTable);

export default router;
