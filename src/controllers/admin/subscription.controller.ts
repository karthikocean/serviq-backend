import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { pagination } from "../../utils/pagination";
import { AuthRequest } from "../../middleware/authMiddleware";
import Plan from "../../models/Plan";
import { 
  getSubscriptionDashboardData, 
  getSubscriptionHistoryList, 
  purchaseBranchAddon,
  renewSubscriptionPlan,
  upgradeSubscriptionPlan
} from "../../services/admin/subscription.service";

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

export const renewPlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const { billingCycle, paymentMethod, couponCode } = req.body;

    const result = await renewSubscriptionPlan(restaurantId, billingCycle, paymentMethod, couponCode);
    sendSuccess(res, result.message, result);
  } catch (error: any) {
    sendError(res, error.message || "Failed to renew plan", StatusCodes.BAD_REQUEST);
  }
};

export const upgradePlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const { newPlanId, billingCycle, paymentMethod } = req.body;

    const result = await upgradeSubscriptionPlan(restaurantId, newPlanId, billingCycle, paymentMethod);
    sendSuccess(res, result.message, result);
  } catch (error: any) {
    sendError(res, error.message || "Failed to upgrade plan", StatusCodes.BAD_REQUEST);
  }
};

export const getAvailablePlans = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = page * limit;

    const query = { isDelete: false, isActive: true, status: "Active" as const };
    const totalCount = await Plan.countDocuments(query);
    const plans = await Plan.find(query).sort({ monthlyPrice: 1 }).skip(skip).limit(limit);

    pagination(totalCount, plans, limit, page, res, "Plans fetched successfully.");
  } catch (error) {
    sendError(res, "Failed to fetch plans", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getPlanById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const plan = await Plan.findOne({ _id: id, isDelete: false, isActive: true });

    if (!plan) {
      sendError(res, "Plan not found", StatusCodes.NOT_FOUND);
      return;
    }

    sendSuccess(res, "Plan details fetched successfully.", plan);
  } catch (error) {
    sendError(res, "Failed to fetch plan details", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

