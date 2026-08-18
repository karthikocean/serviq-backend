import Notification from "../models/Notification";
import { getIO } from "../socket";
import mongoose from "mongoose";

interface SendNotificationParams {
  restaurantId: string | mongoose.Types.ObjectId;
  branchId: string | mongoose.Types.ObjectId;
  receiverType: "KITCHEN" | "WAITER";
  receiverId?: string | mongoose.Types.ObjectId | null;
  orderId?: string | mongoose.Types.ObjectId;
  type: string;
  title: string;
  message: string;
  dataPayload?: any;
}

export const sendNotification = async (params: SendNotificationParams): Promise<void> => {
  try {
    // 1. Save to Database
    const newNotif = await Notification.create({
      restaurantId: params.restaurantId,
      branchId: params.branchId,
      receiverType: params.receiverType,
      receiverId: params.receiverId || null,
      orderId: params.orderId,
      type: params.type,
      title: params.title,
      message: params.message
    });

    // 2. Emit Real-time WebSocket Event
    const io = getIO();
    const eventPayload = {
      notificationId: newNotif._id,
      type: params.type,
      title: params.title,
      message: params.message,
      ...params.dataPayload
    };

    if (params.receiverType === "WAITER" && params.receiverId) {
      io.to(`room_user_${params.receiverId.toString()}`).emit(params.type, eventPayload);
    } else if (params.receiverType === "KITCHEN") {
      if (params.receiverId) {
        io.to(`room_user_${params.receiverId.toString()}`).emit(params.type, eventPayload);
      } else {
        io.to(`room_branch_${params.branchId.toString()}`).emit(params.type, eventPayload);
      }
    }
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
};
