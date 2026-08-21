import { Router } from "express";
import { 
  getAllStaff, 
  createNewStaff, 
  updateStaffDetails, 
  deleteStaffMember, 
  updateDutyStatus 
} from "../../controllers/admin/staff.controller";
import { checkBranchAccess, checkSubscriptionFeature } from "../../middleware/rbacMiddleware";
import { validate } from "../../middleware/validate";
import { 
  createStaffSchema, 
  updateStaffSchema, 
  updateDutyStatusSchema 
} from "../../validations/admin/staff.validation";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin Staff
 *   description: Manage branch staff members
 */

/**
 * @swagger
 * /api/admin/staff:
 *   get:
 *     summary: Get all staff members for the active branch
 *     tags: [Admin Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dutyStatus
 *         schema:
 *           type: string
 *           enum: [ON_DUTY, OFF_DUTY]
 *     responses:
 *       200:
 *         description: List of staff members
 */
router.get("/", checkBranchAccess, checkSubscriptionFeature("STAFF"), getAllStaff);

/**
 * @swagger
 * /api/admin/staff:
 *   post:
 *     summary: Add a new staff member
 *     tags: [Admin Staff]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: "John Doe" }
 *               email: { type: string, example: "john@example.com" }
 *               phoneNumber: { type: string, example: "9876543210" }
 *               password: { type: string, example: "password123" }
 *               roleId: { type: string, example: "60d5ecb8b392d7001f3e9b11" }
 *               kitchenPin: { type: string, example: "1234" }
 *     responses:
 *       201:
 *         description: Staff created
 */
router.post("/", checkBranchAccess, checkSubscriptionFeature("STAFF"), validate(createStaffSchema), createNewStaff);

/**
 * @swagger
 * /api/admin/staff/{staffId}:
 *   put:
 *     summary: Update staff details
 *     tags: [Admin Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
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
 *               name: { type: string }
 *               phoneNumber: { type: string }
 *               roleId: { type: string }
 *               isActive: { type: boolean }
 *               kitchenPin: { type: string }
 *               autoAccept: { type: boolean }
 *     responses:
 *       200:
 *         description: Staff updated
 */
router.put("/:staffId", checkBranchAccess, checkSubscriptionFeature("STAFF"), validate(updateStaffSchema), updateStaffDetails);

/**
 * @swagger
 * /api/admin/staff/{staffId}:
 *   delete:
 *     summary: Remove a staff member
 *     tags: [Admin Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Staff deleted
 */
router.delete("/:staffId", checkBranchAccess, checkSubscriptionFeature("STAFF"), deleteStaffMember);

/**
 * @swagger
 * /api/admin/staff/{staffId}/status:
 *   put:
 *     summary: Toggle staff duty status
 *     tags: [Admin Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
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
 *               dutyStatus:
 *                 type: string
 *                 enum: [ON_DUTY, OFF_DUTY]
 *     responses:
 *       200:
 *         description: Duty status updated
 */
router.put("/:staffId/status", checkBranchAccess, checkSubscriptionFeature("STAFF"), validate(updateDutyStatusSchema), updateDutyStatus);

export default router;
