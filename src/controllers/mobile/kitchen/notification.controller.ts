import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AuthRequest } from "../../../middleware/authMiddleware";
import { sendSuccess, sendError } from "../../../utils/response";
import { pagination } from "../../../utils/pagination";

import Notification from "../../../models/Notification";

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId, activeBranchId, userId } = req.user!;
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = page * limit;

    const query: any = {
      restaurantId,
      branchId: activeBranchId,
      receiverType: "KITCHEN",
      isDelete: false,
      $or: [
        { receiverId: null }, // Branch-wide
        { receiverId: userId } // Specific to this kitchen user
      ]
    };

    const totalCount = await Notification.countDocuments(query);
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    pagination(totalCount, notifications, limit, page, res, "Notifications fetched");
  } catch (error) {
    console.error("Kitchen Notifications Error:", error);
    sendError(res, "Failed to fetch notifications", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId, activeBranchId, userId } = req.user!;
    const { id } = req.params;

    const notification = await Notification.findOne({
      _id: id,
      restaurantId,
      branchId: activeBranchId,
      receiverType: "KITCHEN",
      isDelete: false,
      $or: [
        { receiverId: null },
        { receiverId: userId }
      ]
    });

    if (!notification) {
      return sendError(res, "Notification not found or unauthorized", StatusCodes.NOT_FOUND);
    }

    notification.isRead = true;
    await notification.save();

    sendSuccess(res, "Notification marked as read", { id: notification._id });
  } catch (error) {
    console.error("Kitchen Mark Read Error:", error);
    sendError(res, "Failed to mark notification as read", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
