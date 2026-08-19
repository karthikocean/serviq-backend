import { Router } from "express";
import { getSettings, updateSettings } from "../../controllers/super-admin/setting.controller";

const router = Router();
/**
 * @swagger
 * tags:
 *   name: Super Admin Settings
 *   description: Global Settings management for Super Admin
 */

/**
 * @swagger
 * /api/super-admin/settings:
 *   get:
 *     summary: Get global system settings
 *     tags: [Super Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings fetched successfully
 */
router.get("/", getSettings);

/**
 * @swagger
 * /api/super-admin/settings:
 *   put:
 *     summary: Update global system settings
 *     tags: [Super Admin Settings]
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
 *               legalName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.put("/", updateSettings);

export default router;
