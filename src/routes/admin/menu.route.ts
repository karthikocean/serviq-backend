import { Router } from "express";
import { 
  getItems, 
  createItem, 
  updateItem, 
  toggleItem, 
  deleteItem, 
  getCats, 
  createCategoryController,
  updateCategoryController,
  deleteCategoryController
} from "../../controllers/admin/menu.controller";
import { checkBranchAccess, checkSubscriptionFeature, checkPermission } from "../../middleware/rbacMiddleware";
import { validate } from "../../middleware/validate";
import { 
  createMenuItemSchema, 
  updateMenuItemSchema, 
  toggleMenuAvailabilitySchema, 
  createCategorySchema 
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
 * /api/admin/menu/category:
 *   post:
 *     summary: Create a menu category
 *     tags: [Admin Menu]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Category created
 */
router.post("/category", checkBranchAccess, checkSubscriptionFeature("MENU"), checkPermission("MENU", "add"), validate(createCategorySchema), createCategoryController);

/**
 * @swagger
 * /api/admin/menu/category/{id}:
 *   put:
 *     summary: Update a menu category
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Category updated
 */
router.put("/category/:id", checkBranchAccess, checkSubscriptionFeature("MENU"), checkPermission("MENU", "edit"), updateCategoryController);

/**
 * @swagger
 * /api/admin/menu/category/{id}:
 *   delete:
 *     summary: Delete a menu category
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
 *         description: Category deleted
 */
router.delete("/category/:id", checkBranchAccess, checkSubscriptionFeature("MENU"), checkPermission("MENU", "delete"), deleteCategoryController);

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
