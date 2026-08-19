import { Router } from "express";
import { getAllTickets, updateTicketStatus, assignTicket } from "../../controllers/super-admin/ticket.controller";

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
 *     summary: Get all tickets with pagination, search and filters
 *     tags: [Super Admin Tickets]
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
 *         name: searchTerm
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
 *     responses:
 *       200:
 *         description: Tickets fetched successfully
 */
router.get("/", getAllTickets);


/**
 * @swagger
 * /api/super-admin/tickets/{id}/status:
 *   patch:
 *     summary: Update ticket status
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
 *     responses:
 *       200:
 *         description: Ticket status updated successfully
 */
router.patch("/:id/status", updateTicketStatus);

/**
 * @swagger
 * /api/super-admin/tickets/{id}/assign:
 *   patch:
 *     summary: Assign ticket to a user
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
 *     responses:
 *       200:
 *         description: Ticket assigned successfully
 */
router.patch("/:id/assign", assignTicket);

export default router;
