import { Router } from "express";
import { getMyTickets, createTicket } from "../../controllers/admin/ticket.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin Tickets
 *   description: Support Tickets management for Restaurant Admin
 */

/**
 * @swagger
 * /api/admin/tickets:
 *   get:
 *     summary: Get all tickets for the authenticated restaurant
 *     tags: [Admin Tickets]
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
router.get("/", getMyTickets);

/**
 * @swagger
 * /api/admin/tickets:
 *   post:
 *     summary: Raise a new support ticket
 *     tags: [Admin Tickets]
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
 *               category:
 *                 type: string
 *               priority:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Ticket created successfully
 */
router.post("/", createTicket);

export default router;
