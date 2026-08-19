import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/authMiddleware";
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  updateOrderItems,
  deleteOrder
} from "../../services/admin/order.service";
import { getTargetBranchId } from "../../utils/authUtils";

export const getAllOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const status = req.query.status as string | undefined;
    const orders = await getOrders(restaurantId, branchId, status);
    sendSuccess(res, "Orders fetched successfully.", orders);
  } catch (error) {
    sendError(res, "Failed to fetch orders", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getSingleOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const orderId = req.params.orderId as string;
    const order = await getOrderById(restaurantId, branchId, orderId);
    sendSuccess(res, "Order fetched successfully.", order);
  } catch (error: any) {
    if (error.message === "Order not found") {
      sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else {
      sendError(res, "Failed to fetch order", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const createNewOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const newOrder = await createOrder(restaurantId, branchId, req.body);
    sendSuccess(res, "Order created successfully.", { id: newOrder._id, orderId: newOrder.orderId });
  } catch (error: any) {
    sendError(res, "Failed to create order", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const updateStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const orderId = req.params.orderId as string;
    const { status } = req.body;
    await updateOrderStatus(restaurantId, branchId, orderId, status);
    sendSuccess(res, "Order status updated successfully.");
  } catch (error: any) {
    if (error.message === "Order not found") {
      sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else {
      sendError(res, "Failed to update order status", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const updateItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const orderId = req.params.orderId as string;
    await updateOrderItems(restaurantId, branchId, orderId, req.body);
    sendSuccess(res, "Order items updated successfully.");
  } catch (error: any) {
    if (error.message === "Order not found") {
      sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else {
      sendError(res, "Failed to update order items", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const deleteOrderRecord = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const orderId = req.params.orderId as string;
    await deleteOrder(restaurantId, branchId, orderId);
    sendSuccess(res, "Order deleted successfully.");
  } catch (error: any) {
    if (error.message === "Order not found") {
      sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else {
      sendError(res, "Failed to delete order", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};
