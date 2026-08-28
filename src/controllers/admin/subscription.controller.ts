import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { pagination } from "../../utils/pagination";
import { AuthRequest } from "../../middleware/authMiddleware";
import { getSubscriptionDashboardData, getSubscriptionHistoryList, purchaseBranchAddon } from "../../services/admin/subscription.service";

export const getSubscriptionDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const dashboardData = await getSubscriptionDashboardData(restaurantId);
    sendSuccess(res, "Subscription dashboard data fetched successfully.", dashboardData);
  } catch (error: any) {
    if (error.message === "No active subscription found for this restaurant.") {
      sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else {
      sendError(res, "Failed to fetch subscription dashboard data", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const getSubscriptionHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = page * limit;

    const { history, totalCount } = await getSubscriptionHistoryList(restaurantId, skip, limit);
    pagination(totalCount, history, limit, page, res, "Subscription history fetched successfully.");
  } catch (error) {
    sendError(res, "Failed to fetch subscription history", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const buyBranchAddon = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const { additionalSlots, paymentMethod } = req.body;

    const result = await purchaseBranchAddon(restaurantId, additionalSlots, paymentMethod);
    sendSuccess(res, result.message, result);
  } catch (error: any) {
    if (error.message === "No active subscription found for this restaurant.") {
      sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else {
      sendError(res, "Failed to purchase branch addon", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};
