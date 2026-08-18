import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import Order from "../../../models/Order";
import { AuthRequest } from "../../../middleware/authMiddleware";
import { sendSuccess, sendError } from "../../../utils/response";

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId, activeBranchId, userId } = req.user!;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await Order.aggregate([
      {
        $match: {
          restaurantId,
          branchId: activeBranchId,
          waiterId: userId,
          createdAt: { $gte: today },
          isDelete: false
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          total: { $sum: "$total" }
        }
      }
    ]);

    let todaySales = 0;
    let pendingBills = 0;

    stats.forEach(stat => {
      if (stat._id === "done") todaySales += stat.total;
      if (stat._id !== "done" && stat._id !== "cancelled") pendingBills += stat.count;
    });

    sendSuccess(res, "Dashboard stats fetched", {
      todaySales,
      pendingBills,
      totalOrders: stats.reduce((acc, curr) => acc + curr.count, 0)
    });
  } catch (error) {
    console.error("Waiter Dashboard Error:", error);
    sendError(res, "Failed to fetch dashboard stats", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
