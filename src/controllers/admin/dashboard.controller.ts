import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/authMiddleware";
import { getTargetBranchId } from "../../utils/authUtils";
import * as dashboardService from "../../services/admin/dashboard.service";

/**
 * 1. Unified Dashboard Overview
 * GET /api/admin/dashboard
 */
export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      return sendError(res, "Restaurant context missing.", StatusCodes.UNAUTHORIZED);
    }

    const branchId = getTargetBranchId(req);
    const period = (req.query.period as string) || "last6months";

    const overview = await dashboardService.getDashboardOverview(restaurantId, branchId, period);
    sendSuccess(res, "Dashboard data fetched successfully.", overview);
  } catch (error: any) {
    console.error("Dashboard Controller Error:", error);
    sendError(res, "Failed to fetch dashboard data.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * 2. Top Metric Cards (Stats)
 * GET /api/admin/dashboard/stats
 */
export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      return sendError(res, "Restaurant context missing.", StatusCodes.UNAUTHORIZED);
    }

    const branchId = getTargetBranchId(req);
    const stats = await dashboardService.getDashboardStats(restaurantId, branchId);
    sendSuccess(res, "Dashboard stats fetched successfully.", stats);
  } catch (error: any) {
    console.error("Dashboard Stats Error:", error);
    sendError(res, "Failed to fetch dashboard stats.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * 3. Revenue Growth Chart
 * GET /api/admin/dashboard/revenue-growth
 */
export const getRevenueGrowthData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      return sendError(res, "Restaurant context missing.", StatusCodes.UNAUTHORIZED);
    }

    const branchId = getTargetBranchId(req);
    const period = (req.query.period as string) || "last6months";

    const revenueGrowth = await dashboardService.getRevenueGrowth(restaurantId, branchId, period);
    sendSuccess(res, "Revenue growth data fetched successfully.", revenueGrowth);
  } catch (error: any) {
    console.error("Dashboard Revenue Growth Error:", error);
    sendError(res, "Failed to fetch revenue growth data.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * 4. Order Breakdown by Category
 * GET /api/admin/dashboard/order-breakdown
 */
export const getOrderBreakdownData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      return sendError(res, "Restaurant context missing.", StatusCodes.UNAUTHORIZED);
    }

    const branchId = getTargetBranchId(req);
    const breakdown = await dashboardService.getOrderBreakdown(restaurantId, branchId);
    sendSuccess(res, "Order breakdown fetched successfully.", breakdown);
  } catch (error: any) {
    console.error("Dashboard Order Breakdown Error:", error);
    sendError(res, "Failed to fetch order breakdown.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * 5. Live Order Feed
 * GET /api/admin/dashboard/live-orders
 */
export const getLiveOrderFeed = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      return sendError(res, "Restaurant context missing.", StatusCodes.UNAUTHORIZED);
    }

    const branchId = getTargetBranchId(req);
    const limit = parseInt(req.query.limit as string, 10) || 5;

    const liveOrders = await dashboardService.getLiveOrders(restaurantId, branchId, limit);
    sendSuccess(res, "Live orders fetched successfully.", liveOrders);
  } catch (error: any) {
    console.error("Dashboard Live Orders Error:", error);
    sendError(res, "Failed to fetch live orders.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * 6. Live Tables Status
 * GET /api/admin/dashboard/live-tables
 */
export const getLiveTablesStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      return sendError(res, "Restaurant context missing.", StatusCodes.UNAUTHORIZED);
    }

    const branchId = getTargetBranchId(req);
    const liveTables = await dashboardService.getLiveTables(restaurantId, branchId);
    sendSuccess(res, "Live tables status fetched successfully.", liveTables);
  } catch (error: any) {
    console.error("Dashboard Live Tables Error:", error);
    sendError(res, "Failed to fetch live tables status.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * 7. Branch-wise Performance Overview
 * GET /api/admin/dashboard/branch-performance
 */
export const getBranchPerformanceData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      return sendError(res, "Restaurant context missing.", StatusCodes.UNAUTHORIZED);
    }

    const branchPerformance = await dashboardService.getBranchPerformance(restaurantId);
    sendSuccess(res, "Branch performance data fetched successfully.", branchPerformance);
  } catch (error: any) {
    console.error("Dashboard Branch Performance Error:", error);
    sendError(res, "Failed to fetch branch performance data.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
