import { Router } from "express";
import { getUsers, getStations, createUser, updateUser, deleteUser, changePassword } from "../../controllers/admin/user.controller";
import { protectAdmin, restrictTo } from "../../middleware/authMiddleware";
import { validate } from "../../middleware/validate";
import { createUserSchema, updateUserSchema } from "../../validations/admin/user.validation";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin Users
 *   description: Administrative user management
 */

router.use(protectAdmin);
router.use(restrictTo("RESTAURANT_OWNER", "SUPER_ADMIN", "BRANCH_ADMIN"));

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Lists all administrative users with assigned roles, branch scopes, and last login.
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Filter by branch ID
 *     responses:
 *       200:
 *         description: Users fetched successfully
 */
router.get("/", getUsers);
router.get("/stations", getStations);

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: Creates a new user account with role assignment.
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               password:
 *                 type: string
 *               userType:
 *                 type: string
 *                 enum: [BRANCH_ADMIN, STAFF]
 *               roleId:
 *                 type: string
 *               branchId:
 *                 type: string
 *     responses:
 *       200:
 *         description: User created
 */
router.post("/", validate(createUserSchema), createUser);

/**
 * @swagger
 * /api/admin/users/{userId}:
 *   put:
 *     summary: Updates user details, status, or assigned role.
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               name:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               userType:
 *                 type: string
 *                 enum: [BRANCH_ADMIN, STAFF]
 *               roleId:
 *                 type: string
 *               branchId:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated
 */
router.put("/:userId", validate(updateUserSchema), updateUser);

/**
 * @swagger
 * /api/admin/users/{userId}:
 *   delete:
 *     summary: Removes a user account.
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 */
router.delete("/:userId", deleteUser);

/**
 * @swagger
 * /api/admin/users/{userId}/password:
 *   put:
 *     summary: Update a user's password.
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated
 */
router.put("/:userId/password", changePassword);

export default router;
