import { Router } from "express";
import { getAllTickets, getTicketById, updateTicketStatus, assignTicket } from "../../controllers/super-admin/ticket.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Super Admin Tickets
 *   description: Support Tickets management for Super Admin
 */

/**
 * @swagger
 * /api/super-admin/tickets:
 *   get:
 *     summary: Get all support tickets with pagination, search, and filters
 *     tags: [Super Admin Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: statusFilter
 *         schema:
 *           type: string
 *       - in: query
 *         name: priorityFilter
 *         schema:
 *           type: string
 *       - in: query
 *         name: categoryFilter
 *         schema:
 *           type: string
 *       - in: query
 *         name: restaurantId
 *         schema:
 *           type: string
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *       - in: query
 *         name: isEscalated
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: viewAll
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Tickets fetched successfully
 */
router.get("/", getAllTickets);

/**
 * @swagger
 * /api/super-admin/tickets/{id}:
 *   get:
 *     summary: Get ticket details by ID for Super Admin
 *     tags: [Super Admin Tickets]
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
 *         description: Ticket fetched successfully
 *       404:
 *         description: Ticket not found
 */
router.get("/:id", getTicketById);

/**
 * @swagger
 * /api/super-admin/tickets/{id}/status:
 *   patch:
 *     summary: Update ticket status and resolution by Super Admin
 *     tags: [Super Admin Tickets]
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
 *               status:
 *                 type: string
 *                 example: "Resolved"
 *               resolution:
 *                 type: string
 *                 example: "Resolved core sync issue in server build v2.4."
 *     responses:
 *       200:
 *         description: Ticket status and resolution updated successfully
 */
router.patch("/:id/status", updateTicketStatus);

/**
 * @swagger
 * /api/super-admin/tickets/{id}/assign:
 *   patch:
 *     summary: Assign ticket to a support user
 *     tags: [Super Admin Tickets]
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
 *               assignedUser:
 *                 type: string
 *                 example: "John Doe (Support L2)"
 *     responses:
 *       200:
 *         description: Ticket assigned successfully
 */
router.patch("/:id/assign", assignTicket);

export default router;
