import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import Order from "../../../models/Order";
import { AuthRequest } from "../../../middleware/authMiddleware";
import { sendSuccess, sendError } from "../../../utils/response";
import { pagination } from "../../../utils/pagination";
import { sendNotification } from "../../../utils/notificationHelper";

export const getActiveOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId, activeBranchId } = req.user!;
    const { status } = req.query;
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = page * limit;

    const query: any = {
      restaurantId,
      branchId: activeBranchId,
      status: { $nin: ["done", "cancelled"] },
      isDelete: false
    };

    if (status) {
      query.status = status;
    }

    const totalCount = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate("tableId", "tableNumber section")
      .populate("items.menuItem", "name veg")
      .sort({ createdAt: 1 }) // Oldest first for kitchen
      .skip(skip)
      .limit(limit);

    pagination(totalCount, orders, limit, page, res, "Active kitchen orders fetched");
  } catch (error) {
    console.error("Kitchen Get Active Orders Error:", error);
    sendError(res, "Failed to fetch active orders", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId, activeBranchId } = req.user!;
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findOne({ _id: id, branchId: activeBranchId, isDelete: false });
    if (!order) return sendError(res, "Order not found", StatusCodes.NOT_FOUND);

    order.status = status;
    
    // Also update all items inside the order if the main order status changes to READY
    if (status === "ready") {
      order.items.forEach(item => {
        item.status = "ready";
      });
    } else if (status === "cancelled") {
      order.items.forEach(item => {
        item.status = "cancelled";
      });
    }

    await order.save();

    if (order.waiterId) {
      if (status === "ready") {
        await sendNotification({
          restaurantId: restaurantId as string,
          branchId: activeBranchId as string,
          receiverType: "WAITER",
          receiverId: order.waiterId as any,
          type: "ORDER_READY",
          title: "Order Ready",
          message: `Order #${order.orderId} is ready to be served!`,
          orderId: order._id.toString(),
          dataPayload: { orderId: order._id, tableId: order.tableId }
        });
      } else if (status === "cancelled") {
        await sendNotification({
          restaurantId: restaurantId as string,
          branchId: activeBranchId as string,
          receiverType: "WAITER",
          receiverId: order.waiterId as any,
          type: "ORDER_CANCELLED",
          title: "Order Cancelled by Kitchen",
          message: `Order #${order.orderId} was rejected by the kitchen.`,
          orderId: order._id.toString(),
          dataPayload: { orderId: order._id, reason: "Kitchen Rejected" }
        });
      }
    }

    sendSuccess(res, "Order status updated", order);
  } catch (error) {
    console.error("Kitchen Update Order Status Error:", error);
    sendError(res, "Failed to update order status", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const updateItemStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId, activeBranchId } = req.user!;
    const { id, itemId } = req.params;
    const { status } = req.body;

    const order = await Order.findOne({ _id: id, branchId: activeBranchId, isDelete: false });
    if (!order) return sendError(res, "Order not found", StatusCodes.NOT_FOUND);

    const item = order.items.find((i: any) => i._id.toString() === itemId);
    if (!item) return sendError(res, "Item not found in order", StatusCodes.NOT_FOUND);

    item.status = status;
    await order.save();

    if (status === "ready" && order.waiterId) {
      await sendNotification({
        restaurantId: restaurantId as string,
        branchId: activeBranchId as string,
        receiverType: "WAITER",
        receiverId: order.waiterId as any,
        type: "ITEM_READY",
        title: "Item Ready",
        message: `${item.name || 'An item'} is ready for Order #${order.orderId}`,
        orderId: order._id.toString(),
        dataPayload: {
          orderId: order._id,
          itemId: itemId,
          tableId: order.tableId
        }
      });
    }

    sendSuccess(res, "Item status updated", { orderId: order._id, itemId: itemId, status });
  } catch (error) {
    console.error("Kitchen Update Item Status Error:", error);
    sendError(res, "Failed to update item status", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
