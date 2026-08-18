import { Router } from "express";
import { getNotifications, markAsRead } from "../../../controllers/mobile/kitchen/notification.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Kitchen Notifications
 *   description: Kitchen Station notification endpoints
 */

/**
 * @swagger
 * /api/mobile/kitchen/notifications:
 *   get:
 *     summary: Retrieve recent kitchen alerts/messages
 *     tags: [Kitchen Notifications]
 *     security:
 *       - bearerAuth: []
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
 * /api/mobile/kitchen/notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Kitchen Notifications]
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
