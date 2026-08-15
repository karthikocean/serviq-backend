import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/authMiddleware";
import {
  getStaffByRestaurantId,
  createStaff,
  updateStaff,
  deleteStaff,
  toggleStaffDutyStatus
} from "../../services/admin/staff.service";
import { getTargetBranchId } from "../../utils/authUtils";

export const getAllStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const dutyStatus = req.query.dutyStatus as string | undefined;
    const staffMembers = await getStaffByRestaurantId(restaurantId, branchId, dutyStatus);
    sendSuccess(res, "Staff fetched successfully.", staffMembers);
  } catch (error) {
    sendError(res, "Failed to fetch staff", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const createNewStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const newStaff = await createStaff(restaurantId, branchId, req.body);
    sendSuccess(res, "Staff created successfully.", { id: newStaff._id });
  } catch (error: any) {
    if (error.message === "Email already registered") {
      sendError(res, error.message, StatusCodes.CONFLICT);
    } else {
      sendError(res, "Failed to create staff", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const updateStaffDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const staffId = req.params.staffId as string;
    await updateStaff(restaurantId, branchId, staffId, req.body);
    sendSuccess(res, "Staff updated successfully.");
  } catch (error: any) {
    if (error.message === "Staff not found") {
      sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else {
      sendError(res, "Failed to update staff", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const deleteStaffMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const staffId = req.params.staffId as string;
    await deleteStaff(restaurantId, branchId, staffId);
    sendSuccess(res, "Staff deleted successfully.");
  } catch (error: any) {
    if (error.message === "Staff not found") {
      sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else {
      sendError(res, "Failed to delete staff", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const updateDutyStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const staffId = req.params.staffId as string;
    const { dutyStatus } = req.body;
    await toggleStaffDutyStatus(restaurantId, branchId, staffId, dutyStatus);
    sendSuccess(res, "Staff duty status updated successfully.");
  } catch (error: any) {
    if (error.message === "Staff not found") {
      sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else {
      sendError(res, "Failed to update duty status", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};
