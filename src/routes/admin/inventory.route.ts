import { Router } from "express";
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  createItem,
  getItems,
  updateItem,
  deleteItem,
  recordPurchase,
  recordReduction,
  getStats,
  getLogs
} from "../../controllers/admin/inventory.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin - Inventory
 *   description: Inventory Management Endpoints
 */

// --- CATEGORIES ---
/**
 * @swagger
 * /api/admin/inventory/categories:
 *   post:
 *     summary: Create an inventory category
 *     tags: [Admin - Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [AVAILABLE, UNAVAILABLE]
 *     responses:
 *       201:
 *         description: Category created successfully
 */
router.post("/categories", createCategory);

/**
 * @swagger
 * /api/admin/inventory/categories:
 *   get:
 *     summary: Get all inventory categories
 *     tags: [Admin - Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Categories fetched successfully
 */
router.get("/categories", getCategories);

/**
 * @swagger
 * /api/admin/inventory/categories/{id}:
 *   put:
 *     summary: Update an inventory category
 *     tags: [Admin - Inventory]
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Category updated successfully
 */
router.put("/categories/:id", updateCategory);

/**
 * @swagger
 * /api/admin/inventory/categories/{id}:
 *   delete:
 *     summary: Delete an inventory category
 *     tags: [Admin - Inventory]
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
 *         description: Category deleted successfully
 */
router.delete("/categories/:id", deleteCategory);

// --- ITEMS ---
/**
 * @swagger
 * /api/admin/inventory/items:
 *   post:
 *     summary: Create an inventory item
 *     tags: [Admin - Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               categoryId:
 *                 type: string
 *               name:
 *                 type: string
 *               sku:
 *                 type: string
 *               currentStock:
 *                 type: number
 *               minAlertLevel:
 *                 type: number
 *               unit:
 *                 type: string
 *               costPerUnit:
 *                 type: number
 *               supplierName:
 *                 type: string
 *               supplierPhone:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [AVAILABLE, LOW_STOCK, OUT_OF_STOCK]
 *     responses:
 *       201:
 *         description: Item created successfully
 */
router.post("/items", createItem);

/**
 * @swagger
 * /api/admin/inventory/items:
 *   get:
 *     summary: Get all inventory items
 *     tags: [Admin - Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Items fetched successfully
 */
router.get("/items", getItems);

/**
 * @swagger
 * /api/admin/inventory/items/{id}:
 *   put:
 *     summary: Update an inventory item
 *     tags: [Admin - Inventory]
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
 *               categoryId:
 *                 type: string
 *               name:
 *                 type: string
 *               sku:
 *                 type: string
 *               currentStock:
 *                 type: number
 *               minAlertLevel:
 *                 type: number
 *               unit:
 *                 type: string
 *               costPerUnit:
 *                 type: number
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Item updated successfully
 */
router.put("/items/:id", updateItem);

/**
 * @swagger
 * /api/admin/inventory/items/{id}:
 *   delete:
 *     summary: Delete an inventory item
 *     tags: [Admin - Inventory]
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
 *         description: Item deleted successfully
 */
router.delete("/items/:id", deleteItem);

// --- PURCHASE & REDUCTION ---
/**
 * @swagger
 * /api/admin/inventory/purchase:
 *   post:
 *     summary: Record a supplier purchase (Restock)
 *     tags: [Admin - Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               itemId:
 *                 type: string
 *               supplierName:
 *                 type: string
 *               supplierPhone:
 *                 type: string
 *               purchaseQty:
 *                 type: number
 *               unitPrice:
 *                 type: number
 *               invoiceNumber:
 *                 type: string
 *               purchaseDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Purchase recorded successfully
 */
router.post("/purchase", recordPurchase);

/**
 * @swagger
 * /api/admin/inventory/reduce:
 *   post:
 *     summary: Record a stock reduction (Usage/Wastage)
 *     tags: [Admin - Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               itemId:
 *                 type: string
 *               quantityToReduce:
 *                 type: number
 *               reason:
 *                 type: string
 *               details:
 *                 type: string
 *     responses:
 *       201:
 *         description: Stock reduced successfully
 */
router.post("/reduce", recordReduction);

// --- STATS & LOGS ---
/**
 * @swagger
 * /api/admin/inventory/stats:
 *   get:
 *     summary: Get inventory dashboard statistics
 *     tags: [Admin - Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stats fetched successfully
 */
router.get("/stats", getStats);

/**
 * @swagger
 * /api/admin/inventory/logs:
 *   get:
 *     summary: Get inventory purchase or reduction logs
 *     tags: [Admin - Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [purchase, reduction]
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Logs fetched successfully
 */
router.get("/logs", getLogs);

export default router;
