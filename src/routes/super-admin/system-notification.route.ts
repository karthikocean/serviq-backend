import { Router } from "express";
import { getAllNotifications, createNotification, cancelNotification, sendDraftNotification, deleteNotification } from "../../controllers/super-admin/system-notification.controller";

const router = Router();
/**
 * @swagger
 * tags:
 *   name: Super Admin System Notifications
 *   description: System Notifications management for Super Admin
 */

/**
 * @swagger
 * /api/super-admin/notifications:
 *   get:
 *     summary: Get all system notifications
 *     tags: [Super Admin System Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: filterType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notifications fetched successfully
 */
router.get("/", getAllNotifications);

/**
 * @swagger
 * /api/super-admin/notifications:
 *   post:
 *     summary: Create a new system notification
 *     tags: [Super Admin System Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subject:
 *                 type: string
 *               type:
 *                 type: string
 *               channel:
 *                 type: string
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: string
 *               body:
 *                 type: string
 *               isScheduled:
 *                 type: boolean
 *               scheduledDate:
 *                 type: string
 *               scheduledTime:
 *                 type: string
 *     responses:
 *       201:
 *         description: Notification created successfully
 */
router.post("/", createNotification);

/**
 * @swagger
 * /api/super-admin/notifications/{id}/cancel:
 *   post:
 *     summary: Cancel a scheduled notification
 *     tags: [Super Admin System Notifications]
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
 *         description: Notification cancelled successfully
 */
router.post("/:id/cancel", cancelNotification);

/**
 * @swagger
 * /api/super-admin/notifications/{id}/send:
 *   post:
 *     summary: Send a draft notification immediately
 *     tags: [Super Admin System Notifications]
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
 *         description: Notification sent successfully
 */
router.post("/:id/send", sendDraftNotification);

/**
 * @swagger
 * /api/super-admin/notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Super Admin System Notifications]
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
 *         description: Notification deleted successfully
 */
router.delete("/:id", deleteNotification);

export default router;
