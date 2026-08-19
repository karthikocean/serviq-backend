import { Router } from "express";
import { getAllLeads, createLead, updateLeadStatus, assignLead, updateFollowUp, convertLead } from "../../controllers/super-admin/lead.controller";

const router = Router();
/**
 * @swagger
 * tags:
 *   name: Super Admin Leads
 *   description: CRM Leads management for Super Admin
 */

/**
 * @swagger
 * /api/super-admin/leads:
 *   get:
 *     summary: Get all leads with pagination, search and filter
 *     tags: [Super Admin Leads]
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
 *         name: leadSearchQuery
 *         schema:
 *           type: string
 *       - in: query
 *         name: leadStatusFilter
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Leads fetched successfully
 */
router.get("/", getAllLeads);

/**
 * @swagger
 * /api/super-admin/leads:
 *   post:
 *     summary: Create a new lead
 *     tags: [Super Admin Leads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessName:
 *                 type: string
 *               contactPerson:
 *                 type: string
 *               emailAddress:
 *                 type: string
 *               mobileNumber:
 *                 type: string
 *               leadSource:
 *                 type: string
 *               leadStatus:
 *                 type: string
 *               followUpDate:
 *                 type: string
 *               assignedTo:
 *                 type: string
 *               remarks:
 *                 type: string
 *     responses:
 *       201:
 *         description: Lead created successfully
 */
router.post("/", createLead);

/**
 * @swagger
 * /api/super-admin/leads/{id}/status:
 *   patch:
 *     summary: Update lead status
 *     tags: [Super Admin Leads]
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
 *               leadStatus:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lead status updated successfully
 */
router.patch("/:id/status", updateLeadStatus);

/**
 * @swagger
 * /api/super-admin/leads/{id}/assign:
 *   patch:
 *     summary: Assign lead to a user
 *     tags: [Super Admin Leads]
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
 *               assignedTo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lead assigned successfully
 */
router.patch("/:id/assign", assignLead);

/**
 * @swagger
 * /api/super-admin/leads/{id}/follow-up:
 *   patch:
 *     summary: Update lead follow-up date
 *     tags: [Super Admin Leads]
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
 *               followUpDate:
 *                 type: string
 *     responses:
 *       200:
 *         description: Follow-up date updated successfully
 */
router.patch("/:id/follow-up", updateFollowUp);

/**
 * @swagger
 * /api/super-admin/leads/{id}/convert:
 *   post:
 *     summary: Convert lead to restaurant
 *     tags: [Super Admin Leads]
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
 *         description: Lead converted successfully
 */
router.post("/:id/convert", convertLead);
export default router;
