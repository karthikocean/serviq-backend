import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/authMiddleware";
import * as reportsService from "../../services/admin/reports.service";
import { getTargetBranchId } from "../../utils/authUtils";

export const getWaiterReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const activeBranchId = getTargetBranchId(req);
    if (!restaurantId || !activeBranchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const { startDate, endDate, branchId, waiterId, search, page, limit } = req.query;

    const queryBranchId = branchId === "All" || !branchId ? activeBranchId : (branchId as string);

    const results = await reportsService.getWaiterReport(
      restaurantId,
      queryBranchId,
      waiterId as string,
      search as string,
      { startDate: startDate as string, endDate: endDate as string }
    );

    // Summary Calculations
    const totalWaiterRevenue = results.reduce((sum, w) => sum + w.totalRevenue, 0);
    const totalOrdersServed = results.reduce((sum, w) => sum + w.ordersServed, 0);
    const activeWaitersOnDuty = results.filter(w => w.dutyStatus === "ON_DUTY").length;
    const totalWaiters = results.length;
    const averageOrderValue = totalOrdersServed > 0 ? (totalWaiterRevenue / totalOrdersServed).toFixed(2) : "0.00";

    const parsedPage = parseInt(page as string) || 1;
    const parsedLimit = limit === "0" ? results.length : (parseInt(limit as string) || 10);

    const startIndex = (parsedPage - 1) * parsedLimit;
    const paginatedResults = results.slice(startIndex, startIndex + parsedLimit);

    const responseData = {
      success: true,
      message: "Waiter Reports fetched successfully",
      summary: {
        totalWaiterRevenue,
        totalOrdersServed,
        activeWaitersOnDuty,
        totalWaiters,
        averageOrderValue
      },
      totalItems: results.length,
      totalPages: Math.ceil(results.length / parsedLimit),
      page: parsedPage,
      data: paginatedResults
    };

    res.status(StatusCodes.OK).json(responseData);
  } catch (error) {
    console.error("Waiter Reports Error:", error);
    sendError(res, "Failed to fetch Waiter Reports", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getKitchenReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const activeBranchId = getTargetBranchId(req);
    if (!restaurantId || !activeBranchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const { startDate, endDate, branchId, categoryId, search, page, limit } = req.query;

    const queryBranchId = branchId === "All" || !branchId ? activeBranchId : (branchId as string);

    const results = await reportsService.getKitchenReport(
      restaurantId,
      queryBranchId,
      categoryId as string,
      search as string,
      { startDate: startDate as string, endDate: endDate as string }
    );

    // Summary Calculations
    const totalDishesPrepared = results.reduce((sum, item) => sum + item.quantityPrepared, 0);
    const foodRevenueGenerated = results.reduce((sum, item) => sum + item.revenueGenerated, 0);
    const activeCategories = new Set(results.map(item => item.categoryId)).size;
    const avgPrepTime = "N/A";

    const parsedPage = parseInt(page as string) || 1;
    const parsedLimit = limit === "0" ? results.length : (parseInt(limit as string) || 10);

    const startIndex = (parsedPage - 1) * parsedLimit;
    const paginatedResults = results.slice(startIndex, startIndex + parsedLimit);

    const responseData = {
      success: true,
      message: "Kitchen Reports fetched successfully",
      summary: {
        totalDishesPrepared,
        foodRevenueGenerated,
        activeCategories,
        avgPrepTime
      },
      totalItems: results.length,
      totalPages: Math.ceil(results.length / parsedLimit),
      page: parsedPage,
      data: paginatedResults
    };

    res.status(StatusCodes.OK).json(responseData);
  } catch (error) {
    console.error("Kitchen Reports Error:", error);
    sendError(res, "Failed to fetch Kitchen Reports", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
