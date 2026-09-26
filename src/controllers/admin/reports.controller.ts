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
    const totalWaiterRevenue = results.reduce((sum, w) => sum + (w.totalRevenue || 0), 0);
    const totalOrdersServed = results.reduce((sum, w) => sum + (w.ordersServed || 0), 0);
    const activeWaitersOnDuty = results.filter(w => w.dutyStatus === "ON_DUTY" || w.status === "On Duty" || w.status === "Active").length;
    const totalWaiters = results.length;
    const averageOrderValue = totalOrdersServed > 0 ? (totalWaiterRevenue / totalOrdersServed).toFixed(2) : "0.00";

    const parsedPage = page !== undefined && page !== "" && !isNaN(parseInt(page as string)) ? Math.max(0, parseInt(page as string)) : 0;
    const parsedLimit = limit === "0" ? results.length : (parseInt(limit as string) || 10);

    const startIndex = parsedPage * parsedLimit;
    const paginatedResults = results.slice(startIndex, startIndex + parsedLimit);

    const responseData = {
      success: true,
      message: "Waiter Reports fetched successfully",
      summary: {
        totalWaiterRevenue,
        salesAmount: totalWaiterRevenue,
        totalOrdersServed,
        ordersHandled: totalOrdersServed,
        billsGenerated: totalOrdersServed,
        activeWaitersOnDuty,
        activeStaff: activeWaitersOnDuty,
        totalWaiters,
        totalStaff: totalWaiters,
        averageOrderValue
      },
      totalItems: results.length,
      totalPages: Math.ceil(results.length / (parsedLimit || 1)),
      page: parsedPage,
      data: paginatedResults
    };

    res.status(StatusCodes.OK).json(responseData);
  } catch (error: any) {
    console.error("Waiter Reports Error:", error);
    sendError(res, error?.message || "Failed to fetch Waiter Reports", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
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

    const parsedPage = page !== undefined && page !== "" && !isNaN(parseInt(page as string)) ? Math.max(0, parseInt(page as string)) : 0;
    const parsedLimit = limit === "0" ? results.length : (parseInt(limit as string) || 10);

    const startIndex = parsedPage * parsedLimit;
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
  } catch (error: any) {
    console.error("Kitchen Reports Error:", error);
    sendError(res, error?.message || "Failed to fetch Kitchen Reports", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getTaxSettlementReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const activeBranchId = getTargetBranchId(req);
    if (!restaurantId || !activeBranchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const { startDate, endDate, branchId, paymentMethod, search, page, limit } = req.query;

    const queryBranchId = branchId === "All" || !branchId ? activeBranchId : (branchId as string);

    const { summary, paymentSettlementTable, gstTaxBreakdown, results } = await reportsService.getTaxSettlementReport(
      restaurantId,
      queryBranchId,
      paymentMethod as string,
      search as string,
      { startDate: startDate as string, endDate: endDate as string }
    );

    const parsedPage = page !== undefined && page !== "" && !isNaN(parseInt(page as string)) ? Math.max(0, parseInt(page as string)) : 0;
    const parsedLimit = limit === "0" ? results.length : (parseInt(limit as string) || 10);

    const startIndex = parsedPage * parsedLimit;
    const paginatedResults = results.slice(startIndex, startIndex + parsedLimit);

    const responseData = {
      success: true,
      message: "Tax & Payment Settlement Reports fetched successfully",
      summary,
      paymentSettlementTable,
      gstTaxBreakdown,
      totalItems: results.length,
      totalPages: Math.ceil(results.length / (parsedLimit || 1)),
      page: parsedPage,
      data: paginatedResults
    };

    res.status(StatusCodes.OK).json(responseData);
  } catch (error: any) {
    console.error("Tax & Settlement Reports Error:", error);
    sendError(res, error?.message || "Failed to fetch Tax & Settlement Reports", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getSalesRevenueReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const activeBranchId = getTargetBranchId(req);
    if (!restaurantId || !activeBranchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const { startDate, endDate, branchId, search, page, limit } = req.query;
    const queryBranchId = branchId === "All" || !branchId ? activeBranchId : (branchId as string);

    const { summary, results } = await reportsService.getSalesRevenueReport(
      restaurantId,
      queryBranchId,
      search as string,
      { startDate: startDate as string, endDate: endDate as string }
    );

    const parsedPage = page !== undefined && page !== "" && !isNaN(parseInt(page as string)) ? Math.max(0, parseInt(page as string)) : 0;
    const parsedLimit = limit === "0" ? results.length : (parseInt(limit as string) || 10);

    const startIndex = parsedPage * parsedLimit;
    const paginatedResults = results.slice(startIndex, startIndex + parsedLimit);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Sales & Revenue Reports fetched successfully",
      summary,
      totalItems: results.length,
      totalPages: Math.ceil(results.length / (parsedLimit || 1)),
      page: parsedPage,
      data: paginatedResults
    });
  } catch (error: any) {
    console.error("Sales & Revenue Reports Error:", error);
    sendError(res, error?.message || "Failed to fetch Sales & Revenue Reports", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getDishPerformanceReports = async (req: AuthRequest, res: Response): Promise<void> => {
  return getKitchenReports(req, res);
};

export const getOrderAnalyticsReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const activeBranchId = getTargetBranchId(req);
    if (!restaurantId || !activeBranchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const { startDate, endDate, branchId, search, page, limit } = req.query;
    const queryBranchId = branchId === "All" || !branchId ? activeBranchId : (branchId as string);

    const { summary, results } = await reportsService.getOrderAnalyticsReport(
      restaurantId,
      queryBranchId,
      search as string,
      { startDate: startDate as string, endDate: endDate as string }
    );

    const parsedPage = page !== undefined && page !== "" && !isNaN(parseInt(page as string)) ? Math.max(0, parseInt(page as string)) : 0;
    const parsedLimit = limit === "0" ? results.length : (parseInt(limit as string) || 10);

    const startIndex = parsedPage * parsedLimit;
    const paginatedResults = results.slice(startIndex, startIndex + parsedLimit);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Order Analytics Reports fetched successfully",
      summary,
      totalItems: results.length,
      totalPages: Math.ceil(results.length / (parsedLimit || 1)),
      page: parsedPage,
      data: paginatedResults
    });
  } catch (error: any) {
    console.error("Order Analytics Reports Error:", error);
    sendError(res, error?.message || "Failed to fetch Order Analytics Reports", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getInventoryStockReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const activeBranchId = getTargetBranchId(req);
    if (!restaurantId || !activeBranchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const { branchId, search, page, limit } = req.query;
    const queryBranchId = branchId === "All" || !branchId ? activeBranchId : (branchId as string);

    const { summary, results } = await reportsService.getInventoryStockReport(
      restaurantId,
      queryBranchId,
      search as string
    );

    const parsedPage = page !== undefined && page !== "" && !isNaN(parseInt(page as string)) ? Math.max(0, parseInt(page as string)) : 0;
    const parsedLimit = limit === "0" ? results.length : (parseInt(limit as string) || 10);

    const startIndex = parsedPage * parsedLimit;
    const paginatedResults = results.slice(startIndex, startIndex + parsedLimit);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Inventory & Stock Reports fetched successfully",
      summary,
      totalItems: results.length,
      totalPages: Math.ceil(results.length / (parsedLimit || 1)),
      page: parsedPage,
      data: paginatedResults
    });
  } catch (error: any) {
    console.error("Inventory & Stock Reports Error:", error);
    sendError(res, error?.message || "Failed to fetch Inventory & Stock Reports", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};


