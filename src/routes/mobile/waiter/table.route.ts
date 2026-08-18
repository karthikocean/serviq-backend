import { Router } from "express";
import { getTables, getAssignedTables } from "../../../controllers/mobile/waiter/table.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Waiter Tables
 *   description: Waiter App table management endpoints
 */

/**
 * @swagger
 * /api/mobile/waiter/tables:
 *   get:
 *     summary: Get all tables
 *     tags: [Waiter Tables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: floor
 *         schema:
 *           type: string
 *         description: Filter tables by section/floor
 *     responses:
 *       200:
 *         description: List of tables
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/", getTables);

/**
 * @swagger
 * /api/mobile/waiter/tables/assigned:
 *   get:
 *     summary: Get tables assigned to the current waiter
 *     tags: [Waiter Tables]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of assigned tables
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/assigned", getAssignedTables);

export default router;
