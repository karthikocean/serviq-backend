import { Router } from "express";
import { getAllPlans, createPlan, updatePlan, deletePlan } from "../../controllers/super-admin/plan.controller";


const router = Router();

/**
 * @swagger
 * tags:
 *   name: Super Admin Plans
 *   description: Manage subscription plans
 */

/**
 * @swagger
 * /api/super-admin/plans:
 *   get:
 *     summary: Get all plans
 *     tags: [Super Admin Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of plans
 *       401:
 *         $ref: '#/components/responses/401'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.get("/", getAllPlans);

/**
 * @swagger
 * /api/super-admin/plans:
 *   post:
 *     summary: Create a new plan
 *     tags: [Super Admin Plans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               planName:
 *                 type: string
 *                 example: "Premium Plan"
 *               planDescription:
 *                 type: string
 *                 example: "All features included for unlimited branches"
 *               monthlyPrice:
 *                 type: number
 *                 example: 999
 *               monthlyDiscount:
 *                 type: number
 *                 example: 10
 *               annualPrice:
 *                 type: number
 *                 example: 10000
 *               maxBranches:
 *                 type: number
 *                 example: 5
 *               featuresIncluded:
 *                 type: object
 *                 example: { "tables": true, "qr-code-config": true, "menu": false }
 *     responses:
 *       201:
 *         description: Plan created
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.post("/", createPlan);

/**
 * @swagger
 * /api/super-admin/plans/{id}:
 *   put:
 *     summary: Update a plan
 *     tags: [Super Admin Plans]
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
 *               planName:
 *                 type: string
 *                 example: "Premium Plan (Updated)"
 *               monthlyPrice:
 *                 type: number
 *                 example: 1099
 *               featuresIncluded:
 *                 type: object
 *                 example: { "tables": true, "menu": true }
 *     responses:
 *       200:
 *         description: Plan updated
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.put("/:id", updatePlan);

/**
 * @swagger
 * /api/super-admin/plans/{id}:
 *   delete:
 *     summary: Delete a plan
 *     tags: [Super Admin Plans]
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
 *         description: Plan deleted
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.delete("/:id", deletePlan);

export default router;
