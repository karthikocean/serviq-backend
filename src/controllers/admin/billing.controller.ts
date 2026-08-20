import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/authMiddleware";
import {
  getBillDetails,
  applyDiscount,
  processTablePayment,
  getBillingHistory as getBillingHistoryService,
  getActiveTablesBilling
} from "../../services/admin/billing.service";
import { getTargetBranchId } from "../../utils/authUtils";

export const getBillingHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const filters = req.query;
    const history = await getBillingHistoryService(restaurantId, branchId, filters);
    sendSuccess(res, "Billing history fetched successfully.", history);
  } catch (error: any) {
    sendError(res, "Failed to fetch billing history", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getActiveTables = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const tables = await getActiveTablesBilling(restaurantId, branchId);
    sendSuccess(res, "Active tables fetched successfully.", tables);
  } catch (error: any) {
    sendError(res, "Failed to fetch active tables", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

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
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const { tableId, paymentMethod } = req.body;
    await processTablePayment(restaurantId, branchId, tableId, paymentMethod);
    sendSuccess(res, "Payment processed successfully.");
  } catch (error: any) {
    if (error.message === "No unpaid orders found for this table.") {
      sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else {
      sendError(res, "Failed to process payment", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};
