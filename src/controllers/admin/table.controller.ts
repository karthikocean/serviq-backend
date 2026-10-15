import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { pagination } from "../../utils/pagination";
import { AuthRequest } from "../../middleware/authMiddleware";
import {
  getTables,
  createTable,
  updateTable,
  deleteTable,
  generateQRsForTables,
  assignWaiterToTables,
  getTableById,
  getNextTableIdStr
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
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    let branchId: string | undefined = undefined;
    const qBranch = req.query.branchId !== undefined && req.query.branchId !== null ? String(req.query.branchId).trim() : undefined;

    if (qBranch && qBranch !== '' && qBranch !== 'ALL' && qBranch !== 'All' && qBranch.toUpperCase() !== 'COMPANY') {
      branchId = qBranch;
    } else if (qBranch === '' || qBranch === 'ALL' || qBranch === 'All' || qBranch?.toUpperCase() === 'COMPANY') {
      branchId = undefined; // Explicitly all branches
    } else {
      // If branchId is not provided in query:
      // For RESTAURANT_OWNER and SUPER_ADMIN (or when omitted): show tables across all branches
      // For branch-level staff (BRANCH_ADMIN / STAFF), restrict to their assigned activeBranchId
      if (req.user?.userType === 'BRANCH_ADMIN' || req.user?.userType === 'STAFF') {
        branchId = req.user?.activeBranchId;
      } else {
        branchId = undefined; // All branches
      }
    }

    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string | undefined;

    const pageIndex = Math.max(0, page);
    const skip = pageIndex * limit;

    const { total, items } = await getTables(restaurantId, branchId, skip, limit, search);
    pagination(total, items, limit, pageIndex, res, "Tables fetched successfully.");
  } catch (error: any) {
    sendError(res, error?.message || "Failed to fetch tables", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getNextTableId = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    let branchId: string | undefined = undefined;
    const qBranch = req.query.branchId !== undefined && req.query.branchId !== null ? String(req.query.branchId).trim() : undefined;

    if (qBranch && qBranch !== '' && qBranch !== 'ALL' && qBranch !== 'All' && qBranch.toUpperCase() !== 'COMPANY') {
      branchId = qBranch;
    } else if (req.user?.userType === 'BRANCH_ADMIN' || req.user?.userType === 'STAFF') {
      branchId = req.user?.activeBranchId;
    }

    const nextId = await getNextTableIdStr(restaurantId, branchId);
    sendSuccess(res, "Next table ID fetched successfully.", { nextId });
  } catch (error: any) {
    sendError(res, error?.message || "Failed to fetch next table ID", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getTable = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const { tableId } = req.params;
    const table = await getTableById(restaurantId, undefined, tableId as string);
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
    let branchId = req.body?.branchId || getTargetBranchId(req);
    if (!restaurantId || !branchId || branchId === 'ALL') {
      return sendError(res, "A valid branchId is required to create a table", StatusCodes.BAD_REQUEST);
    }

    const newTable = await createTable(restaurantId, branchId, req.body);
    sendSuccess(res, "Table created successfully.", { id: newTable?._id });
  } catch (error: any) {
    if (error.message === "Table number already exists") {
      sendError(res, error.message, StatusCodes.CONFLICT);
    } else {
      sendError(res, error?.message || "Failed to create table", StatusCodes.INTERNAL_SERVER_ERROR);
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
