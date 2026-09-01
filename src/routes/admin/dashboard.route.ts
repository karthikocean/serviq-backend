import { Router } from "express";
import {
  getDashboard,
  getStats,
  getRevenueGrowthData,
  getOrderBreakdownData,
  getLiveOrderFeed,
  getLiveTablesStatus,
  getBranchPerformanceData
} from "../../controllers/admin/dashboard.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin Dashboard
 *   description: Real-time dashboard analytics, statistics, revenue graphs, order breakdowns, and branch metrics
 */

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get Complete Dashboard Overview
 *     description: Returns the unified dashboard payload containing top metric cards, revenue growth chart data, category breakdown, live orders feed, live tables status, and multi-branch performance overview.
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Branch ID to filter stats or 'ALL' for entire restaurant network (for Restaurant Owners).
 *         example: "ALL"
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [last6months, last30days, last7days]
 *           default: last6months
 *         description: Period for revenue growth chart calculations.
 *     responses:
 *       200:
 *         description: Complete dashboard overview fetched successfully.
 *       401:
 *         $ref: '#/components/responses/401'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.get("/", getDashboard);

/**
 * @swagger
 * /api/admin/dashboard/stats:
 *   get:
 *     summary: Get Top 8 Metric Cards Statistics
 *     description: Returns real-time metrics for Today's Orders, Active Tables, Today's Revenue + % growth, Monthly Revenue, Staff on Duty, Pending Orders, Completed Orders, and Top Selling Item.
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Optional branch ID filter.
 *     responses:
 *       200:
 *         description: Dashboard stats fetched successfully.
 *       401:
 *         $ref: '#/components/responses/401'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.get("/stats", getStats);

/**
 * @swagger
 * /api/admin/dashboard/revenue-growth:
 *   get:
 *     summary: Get Revenue Growth Chart Data
 *     description: Returns time-series revenue growth data formatted for bar / area charts. When branchId is ALL, also returns branch-wise revenue comparison.
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Optional branch ID filter or 'ALL'.
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [last6months, last30days, last7days]
 *           default: last6months
 *     responses:
 *       200:
 *         description: Revenue growth data fetched successfully.
 *       401:
 *         $ref: '#/components/responses/401'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.get("/revenue-growth", getRevenueGrowthData);

/**
 * @swagger
 * /api/admin/dashboard/order-breakdown:
 *   get:
 *     summary: Get Category Order Breakdown
 *     description: Returns percentage share and volume breakdown of ordered items by menu category (Starters, Main Course, Beverages, Desserts, etc.).
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Optional branch ID filter.
 *     responses:
 *       200:
 *         description: Order breakdown fetched successfully.
 *       401:
 *         $ref: '#/components/responses/401'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.get("/order-breakdown", getOrderBreakdownData);

/**
 * @swagger
 * /api/admin/dashboard/live-orders:
 *   get:
 *     summary: Get Live Order Feed
 *     description: Returns the latest live orders with table, branch, item summary, total, and real-time status.
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Optional branch ID filter.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Number of recent orders to fetch.
 *     responses:
 *       200:
 *         description: Live orders fetched successfully.
 *       401:
 *         $ref: '#/components/responses/401'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.get("/live-orders", getLiveOrderFeed);

/**
 * @swagger
 * /api/admin/dashboard/live-tables:
 *   get:
 *     summary: Get Live Tables Status Grid
 *     description: Returns current occupancy status of dining tables (Available, Occupied, Reserved) and overall occupancy summary.
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Optional branch ID filter.
 *     responses:
 *       200:
 *         description: Live tables status fetched successfully.
 *       401:
 *         $ref: '#/components/responses/401'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.get("/live-tables", getLiveTablesStatus);

/**
 * @swagger
 * /api/admin/dashboard/branch-performance:
 *   get:
 *     summary: Get Multi-Branch Performance Matrix
 *     description: Returns a comprehensive performance overview across all restaurant branches (tables occupied, staff on duty, today orders, revenue).
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Branch performance fetched successfully.
 *       401:
 *         $ref: '#/components/responses/401'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.get("/branch-performance", getBranchPerformanceData);

export default router;
