import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/authMiddleware";
import {
  getActiveKdsOrders,
  updateKdsItemStatus,
  markOrderReady
} from "../../services/admin/kds.service";
import { getTargetBranchId } from "../../utils/authUtils";

export const getKdsOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const orders = await getActiveKdsOrders(restaurantId, branchId);
    sendSuccess(res, "KDS orders fetched successfully.", orders);
  } catch (error) {
    sendError(res, "Failed to fetch KDS orders", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const updateItemStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const orderId = req.params.orderId as string;
    const itemId = req.params.itemId as string;
    const { status } = req.body;
    
    await updateKdsItemStatus(restaurantId, branchId, orderId, itemId, status);
    sendSuccess(res, "Item status updated.");
  } catch (error: any) {
    if (error.message === "Order not found" || error.message === "Item not found in order") {
      sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else {
      sendError(res, "Failed to update item status", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const orderId = req.params.orderId as string;
    await markOrderReady(restaurantId, branchId, orderId);
    sendSuccess(res, "Order marked as ready.");
  } catch (error: any) {
    if (error.message === "Order not found") {
      sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else {
      sendError(res, "Failed to update order status", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};
