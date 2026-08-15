import { Router } from "express";
import { getSettings, updateSettings } from "../../controllers/admin/settings.controller";
import { protectAdmin, restrictTo } from "../../middleware/authMiddleware";
import { validate } from "../../middleware/validate";
import { updateSettingsSchema } from "../../validations/admin/settings.validation";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin Settings
 *   description: Restaurant settings and configuration management
 */

/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     summary: Fetches overall restaurant settings, branding logo, tax rate, and timings.
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Restaurant settings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/", protectAdmin, restrictTo("RESTAURANT_OWNER"), getSettings);

/**
 * @swagger
 * /api/admin/settings:
 *   put:
 *     summary: Updates restaurant metadata, contact info, tax settings, or branding logo.
 *     tags: [Admin Settings]
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
 *               tagline:
 *                 type: string
 *               defaultTaxRate:
 *                 type: number
 *               themeColor:
 *                 type: string
 *               logoUrl:
 *                 type: string
 *               currency:
 *                 type: string
 *               gstNumber:
 *                 type: string
 *               fssaiNumber:
 *                 type: string
 *               openingTime:
 *                 type: string
 *               closingTime:
 *                 type: string
 *     responses:
 *       200:
 *         description: Settings saved successfully
 *       400:
 *         description: Validation Error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put("/", protectAdmin, restrictTo("RESTAURANT_OWNER"), validate(updateSettingsSchema), updateSettings);

export default router;
