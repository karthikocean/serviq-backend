import { Router } from "express";
import {
    getAllNotifications,
    getSuperAdminHeaderNotifications,
    getNotificationById,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    createNotification,
    updateNotification,
    cancelNotification,
    sendDraftNotification,
    deleteNotification
} from "../../controllers/super-admin/system-notification.controller";

const router = Router();
/**
 * @swagger
 * tags:
 *   name: Super Admin System Notifications
 *   description: System Notifications & Header Notification Feed management for Super Admin
 */

/**
 * @swagger
 * /api/super-admin/notifications:
 *   get:
 *     summary: Get super admin header notifications filtered by type (All, Alerts, Tickets, Unread)
 *     tags: [Super Admin System Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter type (all, alerts, tickets, unread)
 *       - in: query
 *         name: tab
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notifications fetched successfully
 */
router.get("/", getSuperAdminHeaderNotifications);

/**
 * @swagger
 * /api/super-admin/notifications/system:
 *   get:
 *     summary: Get all system broadcast notifications (management view)
 *     tags: [Super Admin System Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System notifications fetched successfully
 */
router.get("/system", getAllNotifications);

/**
 * @swagger
 * /api/super-admin/notifications/system/{id}:
 *   get:
 *     summary: Get single system notification details by ID
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
 *         description: System notification details fetched successfully
 */
router.get("/system/:id", getNotificationById);
router.get("/details/:id", getNotificationById);

/**
 * @swagger
 * /api/super-admin/notifications/read-all:
 *   put:
 *     summary: Mark all super admin notifications as read
 *     tags: [Super Admin System Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.put("/read-all", markAllNotificationsAsRead);
router.put("/mark-all-read", markAllNotificationsAsRead);

/**
 * @swagger
 * /api/super-admin/notifications/{id}/read:
 *   put:
 *     summary: Mark a specific notification (Alert or Ticket) as read for super admin
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
 *         description: Notification marked as read
 */
router.put("/:id/read", markNotificationAsRead);

/**
 * @swagger
 * /api/super-admin/notifications/{id}:
 *   put:
 *     summary: Update an existing system broadcast notification
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
 *         description: Notification updated successfully
 */
router.put("/:id", updateNotification);

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
