import { Router } from "express";
import { getCategories, getItems } from "../../../controllers/mobile/waiter/menu.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Waiter Menu
 *   description: Waiter App menu endpoints
 */

/**
 * @swagger
 * /api/mobile/waiter/menu/categories:
 *   get:
 *     summary: Retrieve all menu categories
 *     tags: [Waiter Menu]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/categories", getCategories);

/**
 * @swagger
 * /api/mobile/waiter/menu/items:
 *   get:
 *     summary: Retrieve menu items
 *     tags: [Waiter Menu]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter items by category ID
 *     responses:
 *       200:
 *         description: List of menu items
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/items", getItems);

export default router;
