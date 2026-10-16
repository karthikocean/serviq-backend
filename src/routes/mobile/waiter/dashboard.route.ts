import { Router } from "express";
import { getDashboardStats } from "../../../controllers/mobile/waiter/dashboard.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Waiter Dashboard
 *   description: Waiter App dashboard endpoints
 */

/**
 * @swagger
 * /api/mobile/waiter/dashboard:
 *   get:
 *     summary: Get Waiter Mobile Home Dashboard Data
 *     description: Returns greeting, sales metrics, attention alerts, table metrics (free, seated, cooking, ready, billing), and active tables list.
 *     tags: [Waiter Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Waiter dashboard data fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Waiter dashboard fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     greeting:
 *                       type: string
 *                       example: "Good Afternoon,"
 *                     waiterName:
 *                       type: string
 *                       example: "Deepan"
 *                     unreadNotificationsCount:
 *                       type: integer
 *                       example: 0
 *                     todaySales:
 *                       type: number
 *                       example: 0
 *                     formattedTodaySales:
 *                       type: string
 *                       example: "₹0"
 *                     salesPercentageChange:
 *                       type: string
 *                       example: "+0.0%"
 *                     vsYesterdayLabel:
 *                       type: string
 *                       example: "vs Yesterday"
 *                     needsAttention:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: integer
 *                           example: 0
 *                         message:
 *                           type: string
 *                           example: "All caught up! Service running smoothly."
 *                         items:
 *                           type: array
 *                           items:
 *                             type: object
 *                     metrics:
 *                       type: object
 *                       properties:
 *                         free:
 *                           type: integer
 *                           example: 4
 *                         seated:
 *                           type: integer
 *                           example: 7
 *                         cooking:
 *                           type: integer
 *                           example: 0
 *                         ready:
 *                           type: integer
 *                           example: 0
 *                         billing:
 *                           type: integer
 *                           example: 0
 *                     activeTablesCount:
 *                       type: integer
 *                       example: 6
 *                     myActiveTables:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           orderId:
 *                             type: string
 *                           orderRef:
 *                             type: string
 *                             example: "#b326"
 *                           tableNumber:
 *                             type: string
 *                             example: "T-01"
 *                           status:
 *                             type: string
 *                             example: "new"
 *                           statusLabel:
 *                             type: string
 *                             example: "New"
 *                           itemsText:
 *                             type: string
 *                             example: "1 items"
 *                           timeAgo:
 *                             type: string
 *                             example: "43h 56m ago"
 *                           formattedTotal:
 *                             type: string
 *                             example: "₹110"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/", getDashboardStats);

export default router;
