import { Router } from "express";
import { getNotifications } from "../../controllers/admin/system-notification.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin System Notifications
 *   description: System Notifications fetching for Admin
 */

/**
 * @swagger
 * /api/admin/notifications:
 *   get:
 *     summary: Get relevant system notifications for the admin
 *     tags: [Admin System Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications fetched successfully
 */
router.get("/", getNotifications);

export default router;
