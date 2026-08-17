import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/authMiddleware";
import {
  getTables,
  createTable,
  updateTable,
  deleteTable,
  generateQRsForTables
} from "../../services/admin/table.service";
import { getTargetBranchId } from "../../utils/authUtils";

export const getAllTables = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const tables = await getTables(restaurantId, branchId);
    sendSuccess(res, "Tables fetched successfully.", tables);
  } catch (error) {
    sendError(res, "Failed to fetch tables", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const createNewTable = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const newTable = await createTable(restaurantId, branchId, req.body);
    sendSuccess(res, "Table created successfully.", { id: newTable?._id });
  } catch (error: any) {
    if (error.message === "Table number already exists") {
      sendError(res, error.message, StatusCodes.CONFLICT);
    } else {
      sendError(res, "Failed to create table", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const updateTableDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const tableId = req.params.tableId as string;
    await updateTable(restaurantId, branchId, tableId, req.body);
    sendSuccess(res, "Table updated successfully.");
  } catch (error: any) {
    if (error.message === "Table not found") {
      sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else if (error.message === "Table number already exists") {
      sendError(res, error.message, StatusCodes.CONFLICT);
    } else {
      sendError(res, "Failed to update table", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const deleteTableData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const tableId = req.params.tableId as string;
    await deleteTable(restaurantId, branchId, tableId);
    sendSuccess(res, "Table deleted successfully.");
  } catch (error: any) {
    if (error.message === "Table not found") {
      sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else {
      sendError(res, "Failed to delete table", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const generateQrCodes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const { tableIds } = req.body;
    const qrs = await generateQRsForTables(restaurantId, branchId, tableIds);
    sendSuccess(res, "QR codes generated successfully.", { generated: qrs });
  } catch (error: any) {
    if (error.message === "No valid tables found") {
      sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else {
      sendError(res, "Failed to generate QR codes", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};
