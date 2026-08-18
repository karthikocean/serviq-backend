import { Router } from "express";
import { getNotifications, markAsRead } from "../../../controllers/mobile/waiter/notification.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Waiter Notifications
 *   description: Waiter App notification endpoints
 */

/**
 * @swagger
 * /api/mobile/waiter/notifications:
 *   get:
 *     summary: Get all notifications for the waiter
 *     tags: [Waiter Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of notifications
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/", getNotifications);

/**
 * @swagger
 * /api/mobile/waiter/notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Waiter Notifications]
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
 *       500:
 *         description: Server error
 */
router.patch("/:id/read", markAsRead);

export default router;
