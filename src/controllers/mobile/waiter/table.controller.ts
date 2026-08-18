import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import Table from "../../../models/Table";
import { AuthRequest } from "../../../middleware/authMiddleware";
import { sendSuccess, sendError } from "../../../utils/response";
import { pagination } from "../../../utils/pagination";

export const getTables = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId, activeBranchId } = req.user!;
    const { floor } = req.query;
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = page * limit;

    const query: any = {
      restaurantId,
      branchId: activeBranchId,
      isActive: true,
      isDelete: false
    };

    if (floor) {
      query.section = floor;
    }

    const totalCount = await Table.countDocuments(query);
    const tables = await Table.find(query)
      .populate("assignedWaiter", "name")
      .select("tableNumber seatingCapacity status section assignedWaiter")
      .skip(skip)
      .limit(limit);

    pagination(totalCount, tables, limit, page, res, "Tables fetched successfully");
  } catch (error) {
    console.error("Waiter Tables Error:", error);
    sendError(res, "Failed to fetch tables", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getAssignedTables = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId, activeBranchId, userId } = req.user!;
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = page * limit;

    const query: any = {
      restaurantId,
      branchId: activeBranchId,
      isActive: true,
      isDelete: false,
      $or: [
        { assignedWaiter: userId },
        { coverWaiter: userId }
      ]
    };

    const totalCount = await Table.countDocuments(query);
    const tables = await Table.find(query)
      .select("tableNumber seatingCapacity status section")
      .skip(skip)
      .limit(limit);

    pagination(totalCount, tables, limit, page, res, "Assigned tables fetched successfully");
  } catch (error) {
    console.error("Waiter Assigned Tables Error:", error);
    sendError(res, "Failed to fetch assigned tables", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
