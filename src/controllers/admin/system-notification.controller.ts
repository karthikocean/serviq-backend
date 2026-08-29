import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/authMiddleware";
import SystemNotification from "../../models/SystemNotification";
import Subscription from "../../models/Subscription";

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      sendError(res, "Restaurant context missing.", StatusCodes.UNAUTHORIZED);
      return;
    }

    const activeSubscription = await Subscription.findOne({
      restaurant: restaurantId,
      status: "Active"
    });

    const activePlanId = activeSubscription ? activeSubscription.plan : null;

    const query: any = { status: "Sent" };

    const targetConditions: any[] = [
      { targetType: "ALL" },
      { targetType: "RESTAURANT", targetRestaurants: restaurantId }
    ];

    if (activePlanId) {
      targetConditions.push({ targetType: "PLAN", targetPlan: activePlanId });
    }

    query.$or = targetConditions;

    const notifications = await SystemNotification.find(query).sort({ createdAt: -1 });

    sendSuccess(res, "Notifications fetched successfully.", notifications);
  } catch (error: any) {
    console.error("Admin Notifications Error:", error);
    sendError(res, "Failed to fetch notifications.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
