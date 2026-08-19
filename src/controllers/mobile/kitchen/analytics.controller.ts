import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import Order from "../../../models/Order";
import { AuthRequest } from "../../../middleware/authMiddleware";
import { sendSuccess, sendError } from "../../../utils/response";

export const getAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId, activeBranchId } = req.user!;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await Order.aggregate([
      {
        $match: {
          restaurantId,
          branchId: activeBranchId,
          createdAt: { $gte: today },
          isDelete: false
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    let completedOrders = 0;
    let pendingOrders = 0;

    stats.forEach(stat => {
      if (stat._id === "done") completedOrders += stat.count;
      else if (stat._id !== "cancelled") pendingOrders += stat.count;
    });

    sendSuccess(res, "Kitchen Analytics fetched", {
      totalOrders: completedOrders + pendingOrders,
      completedOrders,
      pendingOrders
    });
  } catch (error) {
    console.error("Kitchen Analytics Error:", error);
    sendError(res, "Failed to fetch analytics", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
