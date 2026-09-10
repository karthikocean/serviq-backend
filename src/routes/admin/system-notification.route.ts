import { Router } from "express";
import { getNotifications, markAsRead, clearAllNotifications } from "../../controllers/admin/system-notification.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin System Notifications
 *   description: Notification & Table Alerts fetching and management for Admin
 */

/**
 * @swagger
 * /api/admin/notifications:
 *   get:
 *     summary: Get all active notifications (Customer Website & SuperAdmin) with category counts
 *     tags: [Admin System Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications fetched successfully
 */
router.get("/", getNotifications);

/**
 * @swagger
 * /api/admin/notifications/{id}/read:
 *   put:
 *     summary: Mark a specific notification as read
 *     tags: [Admin System Notifications]
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
 *         description: Notification marked as read
 */
router.put("/:id/read", markAsRead);

/**
 * @swagger
 * /api/admin/notifications/clear:
 *   delete:
 *     summary: Clear all active notifications for the admin
 *     tags: [Admin System Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications cleared
 */
router.delete("/clear", clearAllNotifications);

export default router;
