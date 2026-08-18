import { Router } from "express";
import { getCategories, getItems, toggleItemAvailability } from "../../../controllers/mobile/kitchen/menu.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Kitchen Menu
 *   description: Kitchen Station menu endpoints
 */

/**
 * @swagger
 * /api/mobile/kitchen/menu/categories:
 *   get:
 *     summary: Retrieve all menu categories
 *     tags: [Kitchen Menu]
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
 * /api/mobile/kitchen/menu/items:
 *   get:
 *     summary: Retrieve menu items
 *     tags: [Kitchen Menu]
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

/**
 * @swagger
 * /api/mobile/kitchen/menu/items/{id}/availability:
 *   patch:
 *     summary: Toggle item availability (In Stock / Out of Stock)
 *     tags: [Kitchen Menu]
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
 *               available: { type: boolean, example: false }
 *     responses:
 *       200:
 *         description: Item availability updated
 *       500:
 *         description: Server error
 */
router.patch("/items/:id/availability", toggleItemAvailability);

export default router;
