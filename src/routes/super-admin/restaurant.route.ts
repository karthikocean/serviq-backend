import { Router } from "express";
import { getAllRestaurants, createRestaurant, updateRestaurant, deleteRestaurant } from "../../controllers/super-admin/restaurant.controller";

import { validate } from "../../middleware/validate";
import { createRestaurantSchema, updateRestaurantSchema } from "../../validations/restaurant.validation";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Super Admin Restaurants
 *   description: Manage restaurants in the system
 */

/**
 * @swagger
 * /api/super-admin/restaurants:
 *   get:
 *     summary: Get all restaurants
 *     tags: [Super Admin Restaurants]
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
 *     responses:
 *       200:
 *         description: List of restaurants
 *       401:
 *         $ref: '#/components/responses/401'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.get("/", getAllRestaurants);

/**
 * @swagger
 * /api/super-admin/restaurants:
 *   post:
 *     summary: Create a new restaurant
 *     tags: [Super Admin Restaurants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               restaurantName: { type: string, example: "ServiQ Grand" }
 *               ownerName: { type: string, example: "John Doe" }
 *               email: { type: string, example: "contact@serviqgrand.com" }
 *               phoneNumber: { type: string, example: "9876543210" }
 *               password: { type: string, example: "securePass123" }
 *               planId: { type: string, example: "64a2b..." }
 *               billingCycle: { type: string, example: "Monthly" }
 *               address: { type: string, example: "123 Main St" }
 *               city: { type: string, example: "Chennai" }
 *               state: { type: string, example: "Tamil Nadu" }
 *               country: { type: string, example: "India" }
 *     responses:
 *       201:
 *         description: Restaurant created
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       409:
 *         description: Email or phone already registered
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.post("/", validate(createRestaurantSchema), createRestaurant);

/**
 * @swagger
 * /api/super-admin/restaurants/{id}:
 *   put:
 *     summary: Update a restaurant
 *     tags: [Super Admin Restaurants]
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
 *               restaurantName: { type: string, example: "ServiQ Grand Updated" }
 *               phoneNumber: { type: string, example: "9876543211" }
 *               websiteDomain: { type: string, example: "serviqgrand.com" }
 *               openingTime: { type: string, example: "09:00" }
 *               closingTime: { type: string, example: "23:00" }
 *               taxRate: { type: number, example: 5 }
 *               isActive: { type: boolean, example: true }
 *     responses:
 *       200:
 *         description: Restaurant updated
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.put("/:id", validate(updateRestaurantSchema), updateRestaurant);

/**
 * @swagger
 * /api/super-admin/restaurants/{id}:
 *   delete:
 *     summary: Delete a restaurant
 *     tags: [Super Admin Restaurants]
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
 *         description: Restaurant deleted
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.delete("/:id", deleteRestaurant);

export default router;
