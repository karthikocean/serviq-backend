import { Router } from "express";
import { createBranch, getAllBranches, getBranchById, updateBranch, deleteBranch } from "../../controllers/admin/branch.controller";
import { protectAdmin } from "../../middleware/authMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin Branches
 *   description: Branch management endpoints for Restaurant Owners
 */

/**
 * @swagger
 * /api/admin/branches:
 *   post:
 *     summary: Create a new branch and manager
 *     tags: [Admin Branches]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - branchName
 *               - branchCode
 *               - contactNumber
 *               - street
 *               - city
 *               - state
 *               - country
 *               - pincode
 *               - managerName
 *               - managerMobile
 *               - managerPassword
 *             properties:
 *               branchName:
 *                 type: string
 *               branchCode:
 *                 type: string
 *               branchOpeningDate:
 *                 type: string
 *                 format: date
 *               contactNumber:
 *                 type: string
 *               email:
 *                 type: string
 *               street:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               country:
 *                 type: string
 *               pincode:
 *                 type: string
 *               managerName:
 *                 type: string
 *               managerMobile:
 *                 type: string
 *               managerEmail:
 *                 type: string
 *               managerPassword:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive]
 *     responses:
 *       201:
 *         description: Branch and Manager created successfully
 *       400:
 *         description: Missing required fields
 *       403:
 *         description: Forbidden (No active subscription, limit reached, or not a RESTAURANT_OWNER)
 *       409:
 *         description: Conflict (Email/Phone or Branch Code already exists)
 *       500:
 *         description: Internal server error
 */
router.post("/", protectAdmin, createBranch);

/**
 * @swagger
 * /api/admin/branches:
 *   get:
 *     summary: Get all branches for the restaurant
 *     tags: [Admin Branches]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of branches retrieved successfully
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.get("/", protectAdmin, getAllBranches);

/**
 * @swagger
 * /api/admin/branches/{id}:
 *   get:
 *     summary: Get branch details by ID
 *     tags: [Admin Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Branch details retrieved successfully
 *       404:
 *         description: Branch not found
 *       500:
 *         description: Internal server error
 */
router.get("/:id", protectAdmin, getBranchById);

/**
 * @swagger
 * /api/admin/branches/{id}:
 *   put:
 *     summary: Update a branch
 *     tags: [Admin Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Branch ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               branchName:
 *                 type: string
 *               branchCode:
 *                 type: string
 *               branchOpeningDate:
 *                 type: string
 *                 format: date
 *               contactNumber:
 *                 type: string
 *               email:
 *                 type: string
 *               street:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               country:
 *                 type: string
 *               pincode:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive]
 *     responses:
 *       200:
 *         description: Branch updated successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Branch not found
 *       409:
 *         description: Branch code already exists
 *       500:
 *         description: Internal server error
 */
router.put("/:id", protectAdmin, updateBranch);

/**
 * @swagger
 * /api/admin/branches/{id}:
 *   delete:
 *     summary: Delete a branch
 *     tags: [Admin Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Branch deleted successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Branch not found
 *       500:
 *         description: Internal server error
 */
router.delete("/:id", protectAdmin, deleteBranch);

export default router;
