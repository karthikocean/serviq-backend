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

    const payload = req.method === "POST" ? req.body : { ...req.query, ...req.body };
    const {
      startDate,
      endDate,
      preset,
      branchId,
      search,
      searchQuery,
      staff,
      staffId,
      waiterId,
      role,
      roleId,
      page,
      limit
    } = payload;

    const queryBranchId = branchId === "All" || branchId === "all" || !branchId ? activeBranchId : (branchId as string);

    const reportData = await reportsService.getStaffPerformanceReport(restaurantId, {
      branchId: queryBranchId,
      preset: preset as string,
      startDate: startDate as string,
      endDate: endDate as string,
      searchQuery: (searchQuery || search) as string,
      staffId: (staffId || waiterId || staff) as string,
      roleId: (roleId || role) as string,
      page: page !== undefined ? parseInt(page as string, 10) : 1,
      limit: limit !== undefined ? parseInt(limit as string, 10) : 10
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Staff Performance Reports fetched successfully",
      summary: reportData.summary,
      tableSummary: reportData.tableSummary,
      totalItems: reportData.totalRecords,
      totalRecords: reportData.totalRecords,
      totalPages: reportData.totalPages,
      page: reportData.currentPage,
      limit: reportData.limit,
      data: reportData.data
    });
  } catch (error: any) {
    console.error("Staff Performance Reports Error:", error);
    sendError(res, error?.message || "Failed to fetch Staff Performance Reports", StatusCodes.INTERNAL_SERVER_ERROR);
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

    const payload = req.method === "POST" ? req.body : { ...req.query, ...req.body };
    const {
      startDate,
      endDate,
      preset,
      branchId,
      search,
      searchQuery,
      taxType,
      paymentMethod,
      tab,
      page,
      limit
    } = payload;

    const queryBranchId = branchId === "All" || branchId === "all" || !branchId ? activeBranchId : (branchId as string);

    const reportData = await reportsService.getTaxSettlementReport(restaurantId, {
      branchId: queryBranchId,
      preset: preset as string,
      startDate: startDate as string,
      endDate: endDate as string,
      searchQuery: (searchQuery || search) as string,
      taxType: taxType as string,
      paymentMethod: paymentMethod as string,
      tab: tab as string,
      page: page !== undefined ? parseInt(page as string, 10) : 1,
      limit: limit !== undefined ? parseInt(limit as string, 10) : 10
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Tax & Payment Settlement Reports fetched successfully",
      summary: reportData.summary,
      tableSummary: reportData.tableSummary,
      taxSummaryTable: reportData.taxSummaryTable,
      paymentSettlementTable: reportData.paymentSettlementTable,
      gstTaxBreakdown: reportData.gstTaxBreakdown,
      totalItems: reportData.totalRecords,
      totalRecords: reportData.totalRecords,
      totalPages: reportData.totalPages,
      page: reportData.currentPage,
      limit: reportData.limit,
      data: reportData.data
    });
  } catch (error: any) {
    console.error("Tax & Settlement Reports Error:", error);
    sendError(res, error?.message || "Failed to fetch Tax & Settlement Reports", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getSalesRevenueReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const activeBranchId = getTargetBranchId(req);
    if (!restaurantId || !activeBranchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const payload = req.method === "POST" ? req.body : { ...req.query, ...req.body };
    const { startDate, endDate, preset, branchId, search, searchQuery, paymentMethod, orderType, page, limit } = payload;

    const queryBranchId = branchId === "All" || branchId === "all" || !branchId ? activeBranchId : (branchId as string);

    const reportData = await reportsService.getSalesRevenueReport(restaurantId, {
      branchId: queryBranchId,
      preset: preset as string,
      startDate: startDate as string,
      endDate: endDate as string,
      searchQuery: (searchQuery || search) as string,
      paymentMethod: paymentMethod as string,
      orderType: orderType as string,
      page: page !== undefined ? parseInt(page as string, 10) : 1,
      limit: limit !== undefined ? parseInt(limit as string, 10) : 10
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Sales & Revenue Reports fetched successfully",
      summary: reportData.summary,
      totalItems: reportData.totalRecords,
      totalRecords: reportData.totalRecords,
      totalPages: reportData.totalPages,
      page: reportData.currentPage,
      limit: reportData.limit,
      data: reportData.data
    });
  } catch (error: any) {
    console.error("Sales & Revenue Reports Error:", error);
    sendError(res, error?.message || "Failed to fetch Sales & Revenue Reports", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getDishPerformanceReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const activeBranchId = getTargetBranchId(req);
    if (!restaurantId || !activeBranchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const payload = req.method === "POST" ? req.body : { ...req.query, ...req.body };
    const {
      startDate,
      endDate,
      preset,
      branchId,
      search,
      searchQuery,
      orderType,
      category,
      categoryId,
      dish,
      dishId,
      menuId,
      foodType,
      page,
      limit
    } = payload;

    const queryBranchId = branchId === "All" || branchId === "all" || !branchId ? activeBranchId : (branchId as string);

    const reportData = await reportsService.getDishPerformanceReport(restaurantId, {
      branchId: queryBranchId,
      preset: preset as string,
      startDate: startDate as string,
      endDate: endDate as string,
      searchQuery: (searchQuery || search) as string,
      orderType: orderType as string,
      categoryId: (categoryId || category) as string,
      dishId: (dishId || menuId || dish) as string,
      foodType: foodType as string,
      page: page !== undefined ? parseInt(page as string, 10) : 1,
      limit: limit !== undefined ? parseInt(limit as string, 10) : 10
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Dish Performance Reports fetched successfully",
      summary: reportData.summary,
      totalItems: reportData.totalRecords,
      totalRecords: reportData.totalRecords,
      totalPages: reportData.totalPages,
      page: reportData.currentPage,
      limit: reportData.limit,
      data: reportData.data
    });
  } catch (error: any) {
    console.error("Dish Performance Reports Error:", error);
    sendError(res, error?.message || "Failed to fetch Dish Performance Reports", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getOrderAnalyticsReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const activeBranchId = getTargetBranchId(req);
    if (!restaurantId || !activeBranchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const payload = req.method === "POST" ? req.body : { ...req.query, ...req.body };
    const {
      startDate,
      endDate,
      preset,
      branchId,
      search,
      searchQuery,
      orderType,
      orderStatus,
      status,
      page,
      limit
    } = payload;

    const queryBranchId = branchId === "All" || branchId === "all" || !branchId ? activeBranchId : (branchId as string);

    const reportData = await reportsService.getOrderAnalyticsReport(restaurantId, {
      branchId: queryBranchId,
      preset: preset as string,
      startDate: startDate as string,
      endDate: endDate as string,
      searchQuery: (searchQuery || search) as string,
      orderType: orderType as string,
      orderStatus: (orderStatus || status) as string,
      page: page !== undefined ? parseInt(page as string, 10) : 1,
      limit: limit !== undefined ? parseInt(limit as string, 10) : 10
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Order Analytics Reports fetched successfully",
      summary: reportData.summary,
      totalItems: reportData.totalRecords,
      totalRecords: reportData.totalRecords,
      totalPages: reportData.totalPages,
      page: reportData.currentPage,
      limit: reportData.limit,
      data: reportData.data
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

    const payload = req.method === "POST" ? req.body : { ...req.query, ...req.body };
    const {
      startDate,
      endDate,
      preset,
      branchId,
      search,
      searchQuery,
      category,
      categoryId,
      item,
      itemId,
      stockStatus,
      transactionType,
      tab,
      page,
      limit
    } = payload;

    const queryBranchId = branchId === "All" || branchId === "all" || !branchId ? activeBranchId : (branchId as string);

    const reportData = await reportsService.getInventoryStockReport(restaurantId, {
      branchId: queryBranchId,
      preset: preset as string,
      startDate: startDate as string,
      endDate: endDate as string,
      searchQuery: (searchQuery || search) as string,
      categoryId: (categoryId || category) as string,
      itemId: (itemId || item) as string,
      stockStatus: stockStatus as string,
      transactionType: transactionType as string,
      tab: tab as string,
      page: page !== undefined ? parseInt(page as string, 10) : 1,
      limit: limit !== undefined ? parseInt(limit as string, 10) : 10
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Inventory & Stock Reports fetched successfully",
      summary: reportData.summary,
      tableSummary: reportData.tableSummary,
      totalItems: reportData.totalRecords,
      totalRecords: reportData.totalRecords,
      totalPages: reportData.totalPages,
      page: reportData.currentPage,
      limit: reportData.limit,
      data: reportData.data
    });
  } catch (error: any) {
    console.error("Inventory & Stock Reports Error:", error);
    sendError(res, error?.message || "Failed to fetch Inventory & Stock Reports", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};


