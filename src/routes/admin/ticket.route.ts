import { Router } from "express";
import { 
    getMyTickets, 
    createTicket, 
    getTicketById, 
    escalateTicketToSuperAdmin, 
    updateTicketStatusByAdmin 
} from "../../controllers/admin/ticket.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin Support Tickets
 *   description: Branch & Company Admin Support Ticket Management
 */

/**
 * @swagger
 * /api/admin/tickets:
 *   get:
 *     summary: Get all tickets for the authenticated restaurant/branch
 *     tags: [Admin Support Tickets]
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
 *         name: branchId
 *         schema:
 *           type: string
 *       - in: query
 *         name: raisedByMeOnly
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: ticketRaisedToFilter
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
 *     tags: [Admin Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - category
 *               - description
 *             properties:
 *               subject:
 *                 type: string
 *                 example: "POS terminal order synchronization issue"
 *               category:
 *                 type: string
 *                 example: "Billing & Payments"
 *               priority:
 *                 type: string
 *                 example: "Medium"
 *               description:
 *                 type: string
 *                 example: "Orders placed on POS 2 are not syncing to the main dashboard."
 *               branchId:
 *                 type: string
 *                 example: "650f1a2b3c4d5e6f7a8b9c0d"
 *               attachmentUrl:
 *                 type: string
 *                 example: "https://example.com/uploads/screenshot.png"
 *               ticketRaisedTo:
 *                 type: string
 *                 enum: ["Company Admin", "Super Admin"]
 *                 example: "Company Admin"
 *     responses:
 *       201:
 *         description: Ticket created successfully
 */
router.post("/", createTicket);

/**
 * @swagger
 * /api/admin/tickets/{id}:
 *   get:
 *     summary: Get ticket details by ID
 *     tags: [Admin Support Tickets]
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
 * /api/admin/tickets/{id}/escalate:
 *   post:
 *     summary: Escalate / Move unresolved ticket to Super Admin (Company Admin -> Super Admin)
 *     tags: [Admin Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               escalationReason:
 *                 type: string
 *                 example: "Requires database fix from ServIQ core engineering team."
 *     responses:
 *       200:
 *         description: Ticket successfully escalated to Super Admin
 *       404:
 *         description: Ticket not found
 */
router.post("/:id/escalate", escalateTicketToSuperAdmin);
router.patch("/:id/escalate", escalateTicketToSuperAdmin);

/**
 * @swagger
 * /api/admin/tickets/{id}/status:
 *   patch:
 *     summary: Update ticket status and resolution by Admin
 *     tags: [Admin Support Tickets]
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
 *                 example: "Restarted POS gateway and synced local cache."
 *     responses:
 *       200:
 *         description: Ticket updated successfully
 */
router.patch("/:id/status", updateTicketStatusByAdmin);

export default router;
