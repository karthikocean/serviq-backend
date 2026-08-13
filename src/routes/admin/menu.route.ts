import { Router } from "express";
import { createMenuItem, getMenuItems, getMenuItem, updateMenuItem, deleteMenuItem } from "../../controllers/admin/menu.controller";
import { checkBranchAccess, checkSubscriptionFeature, checkPermission } from "../../middleware/rbacMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin Menu
 *   description: Manage restaurant menu items
 */

/**
 * @swagger
 * /api/admin/menu:
 *   get:
 *     summary: Get all menu items
 *     tags: [Admin Menu]
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
 *         description: List of menu items
 *       401:
 *         $ref: '#/components/responses/401'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.get("/", checkBranchAccess, checkSubscriptionFeature("MENU"), checkPermission("MENU", "canView"), getMenuItems);

/**
 * @swagger
 * /api/admin/menu:
 *   post:
 *     summary: Create a menu item
 *     tags: [Admin Menu]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: "Margherita Pizza" }
 *               desc: { type: string, example: "Classic delight with 100% real mozzarella cheese" }
 *               price: { type: number, example: 299 }
 *               category: { type: string, example: "Pizza" }
 *               image: { type: string, example: "http://example.com/pizza.jpg" }
 *               available: { type: boolean, example: true }
 *               veg: { type: boolean, example: true }
 *               bestseller: { type: boolean, example: true }
 *     responses:
 *       201:
 *         description: Menu item created
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       409:
 *         description: Menu item already exists
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.post("/", checkBranchAccess, checkSubscriptionFeature("MENU"), checkPermission("MENU", "canCreate"), createMenuItem);

/**
 * @swagger
 * /api/admin/menu/{id}:
 *   get:
 *     summary: Get a specific menu item
 *     tags: [Admin Menu]
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
 *         description: Menu item details
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.get("/:id", checkBranchAccess, checkSubscriptionFeature("MENU"), checkPermission("MENU", "canView"), getMenuItem);

/**
 * @swagger
 * /api/admin/menu/{id}:
 *   put:
 *     summary: Update a menu item
 *     tags: [Admin Menu]
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
 *               name: { type: string, example: "Margherita Pizza Updated" }
 *               desc: { type: string, example: "Extra cheese added" }
 *               price: { type: number, example: 349 }
 *               category: { type: string, example: "Pizza" }
 *               available: { type: boolean, example: false }
 *     responses:
 *       200:
 *         description: Menu item updated
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       409:
 *         description: Name already exists in category
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.put("/:id", checkBranchAccess, checkSubscriptionFeature("MENU"), checkPermission("MENU", "canEdit"), updateMenuItem);

/**
 * @swagger
 * /api/admin/menu/{id}:
 *   patch:
 *     summary: Partially update a menu item
 *     tags: [Admin Menu]
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
 *     responses:
 *       200:
 *         description: Menu item patched
 */
router.patch("/:id", checkBranchAccess, checkSubscriptionFeature("MENU"), checkPermission("MENU", "canEdit"), updateMenuItem);

/**
 * @swagger
 * /api/admin/menu/{id}:
 *   delete:
 *     summary: Delete a menu item
 *     tags: [Admin Menu]
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
 *         description: Menu item deleted
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.delete("/:id", checkBranchAccess, checkSubscriptionFeature("MENU"), checkPermission("MENU", "canDelete"), deleteMenuItem);

export default router;
