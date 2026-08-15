import { Router } from "express";
import { 
  getItems, 
  createItem, 
  updateItem, 
  toggleItem, 
  deleteItem, 
  getCats, 
  createCats 
} from "../../controllers/admin/menu.controller";
import { checkBranchAccess, checkSubscriptionFeature, checkPermission } from "../../middleware/rbacMiddleware";
import { validate } from "../../middleware/validate";
import { 
  createMenuItemSchema, 
  updateMenuItemSchema, 
  toggleMenuAvailabilitySchema, 
  createCategoriesSchema 
} from "../../validations/admin/menu.validation";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin Menu
 *   description: Manage restaurant menu items and categories
 */

// Categories Routes
/**
 * @swagger
 * /api/admin/menu/categories:
 *   get:
 *     summary: Get all unique menu categories
 *     tags: [Admin Menu]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get("/categories", checkBranchAccess, checkSubscriptionFeature("MENU"), checkPermission("MENU", "view"), getCats);

/**
 * @swagger
 * /api/admin/menu/categories:
 *   post:
 *     summary: Add or update categories
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
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Categories updated
 */
router.post("/categories", checkBranchAccess, checkSubscriptionFeature("MENU"), checkPermission("MENU", "add"), validate(createCategoriesSchema), createCats);

// Menu Items Routes
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
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: available
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of menu items
 */
router.get("/", checkBranchAccess, checkSubscriptionFeature("MENU"), checkPermission("MENU", "view"), getItems);

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
 *             $ref: '#/components/schemas/Menu'
 *     responses:
 *       201:
 *         description: Menu item created
 */
router.post("/", checkBranchAccess, checkSubscriptionFeature("MENU"), checkPermission("MENU", "add"), validate(createMenuItemSchema), createItem);

/**
 * @swagger
 * /api/admin/menu/{itemId}:
 *   put:
 *     summary: Update a menu item
 *     tags: [Admin Menu]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *             $ref: '#/components/schemas/Menu'
 *     responses:
 *       200:
 *         description: Menu item updated
 */
router.put("/:itemId", checkBranchAccess, checkSubscriptionFeature("MENU"), checkPermission("MENU", "edit"), validate(updateMenuItemSchema), updateItem);

/**
 * @swagger
 * /api/admin/menu/{itemId}/availability:
 *   patch:
 *     summary: Toggle item availability
 *     tags: [Admin Menu]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *               available:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Menu item availability toggled
 */
router.patch("/:itemId/availability", checkBranchAccess, checkSubscriptionFeature("MENU"), checkPermission("MENU", "edit"), validate(toggleMenuAvailabilitySchema), toggleItem);

/**
 * @swagger
 * /api/admin/menu/{itemId}:
 *   delete:
 *     summary: Delete a menu item
 *     tags: [Admin Menu]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Menu item deleted
 */
router.delete("/:itemId", checkBranchAccess, checkSubscriptionFeature("MENU"), checkPermission("MENU", "delete"), deleteItem);

export default router;
