import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/authMiddleware";
import {
  getBillDetails,
  applyDiscount,
  processPayment
} from "../../services/admin/billing.service";
import { getTargetBranchId } from "../../utils/authUtils";

export const getBill = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const orderId = req.params.orderId as string;
    const bill = await getBillDetails(restaurantId, branchId, orderId);
    sendSuccess(res, "Bill fetched successfully.", bill);
  } catch (error: any) {
    if (error.message === "Order not found") {
      sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else {
      sendError(res, "Failed to fetch bill", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const applyBillDiscount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const orderId = req.params.orderId as string;
    const { discount } = req.body;
    await applyDiscount(restaurantId, branchId, orderId, discount);
    sendSuccess(res, "Discount applied successfully.");
  } catch (error: any) {
    if (error.message === "Order not found or already paid") {
      sendError(res, error.message, StatusCodes.BAD_REQUEST);
    } else {
      sendError(res, "Failed to apply discount", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const payBill = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = req.user?.activeBranchId;
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const orderId = req.params.orderId as string;
    const { paymentMethod } = req.body;
    await processPayment(restaurantId, branchId, orderId, paymentMethod);
    sendSuccess(res, "Payment processed successfully.");
  } catch (error: any) {
    if (error.message === "Order not found") {
      sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else if (error.message === "Order is already paid") {
      sendError(res, error.message, StatusCodes.BAD_REQUEST);
    } else {
      sendError(res, "Failed to process payment", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};
