import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/authMiddleware";
import {
  getTables,
  createTable,
  updateTable,
  deleteTable,
  generateQRsForTables,
  assignWaiterToTables,
  getTableById
} from "../../services/admin/table.service";
import { getTargetBranchId } from "../../utils/authUtils";

export const assignWaiter = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const { waiterId, tableIds, coverWaiterId } = req.body;
    await assignWaiterToTables(restaurantId, branchId, waiterId, tableIds, coverWaiterId);
    sendSuccess(res, "Waiter assigned to tables successfully.");
  } catch (error: any) {
    if (error.message.includes("not found") || error.message.includes("belong to this branch")) {
      sendError(res, error.message, StatusCodes.BAD_REQUEST);
    } else {
      sendError(res, "Failed to assign waiter to tables", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const getAllTables = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    let branchId = getTargetBranchId(req);
    
    // If the user explicitly requested all branches (empty branchId) and has permission
    if (!branchId && req.query.branchId === '' && (req.user?.userType === "RESTAURANT_OWNER" || req.user?.userType === "SUPER_ADMIN")) {
      branchId = undefined;
    } else if (!branchId) {
      return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);
    }

    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const tables = await getTables(restaurantId, branchId);
    sendSuccess(res, "Tables fetched successfully.", tables);
  } catch (error) {
    sendError(res, "Failed to fetch tables", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getTable = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const { tableId } = req.params;
    const table = await getTableById(restaurantId, branchId as string, tableId as string);
    sendSuccess(res, "Table fetched successfully.", table);
  } catch (error: any) {
    if (error.message === "Table not found") {
      sendError(res, "Table not found", StatusCodes.NOT_FOUND);
    } else {
      sendError(res, "Failed to fetch table", StatusCodes.INTERNAL_SERVER_ERROR);
    }
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
