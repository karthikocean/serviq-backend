import { getTargetBranchId } from "../../utils/authUtils";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { pagination } from "../../utils/pagination";
import { AuthRequest } from "../../middleware/authMiddleware";
import { getUsersByRestaurantId, getStationsByRestaurantId, createUserForRestaurant, updateUserForRestaurant, deleteUserForRestaurant, changePasswordForRestaurant } from "../../services/admin/user.service";

export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const isOwner = req.user?.userType === 'RESTAURANT_OWNER' || req.user?.userType === 'SUPER_ADMIN';
    const rawBranchId = (req.query.branchId || req.body?.branchId) as string | undefined;

    let branchId: string | undefined = undefined;
    if (rawBranchId && rawBranchId !== 'ALL' && rawBranchId !== 'All' && rawBranchId !== 'COMPANY' && rawBranchId !== 'company' && /^[0-9a-fA-F]{24}$/.test(rawBranchId)) {
      branchId = rawBranchId;
    } else if (!isOwner) {
      const scoped = req.user?.activeBranchId || req.user?.branchId;
      if (scoped && scoped !== 'ALL' && scoped !== 'COMPANY' && /^[0-9a-fA-F]{24}$/.test(String(scoped))) {
        branchId = String(scoped);
      }
    }

    const search = (req.query.search || req.query.searchQuery || req.query.searchTerm) as string;
    const roleFilter = (req.query.roleFilter || req.query.role) as string;
    const statusFilter = (req.query.statusFilter || req.query.status) as string;
    const dutyFilter = (req.query.dutyFilter || req.query.dutyStatus) as string;
    
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;
    const pageIndex = Math.max(0, page);
    const skip = pageIndex * limit;

    const { total, users } = await getUsersByRestaurantId(restaurantId, branchId, search, roleFilter, statusFilter, skip, limit, dutyFilter);
    
    pagination(total, users, limit, pageIndex, res, "Users fetched successfully.");
  } catch (error: any) {
    sendError(res, error?.message || "Failed to fetch users", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getStations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const branchId = getTargetBranchId(req);
    
    const { data } = await getStationsByRestaurantId(restaurantId, branchId);
    
    sendSuccess(res, "Station users fetched successfully.", data);
  } catch (error: any) {
    sendError(res, error?.message || "Failed to fetch station users", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const bodyData = { ...req.body };
    const creatorBranchId = getTargetBranchId(req) || req.user?.activeBranchId || req.user?.branchId;
    if (!bodyData.branchId && creatorBranchId && creatorBranchId !== 'ALL' && creatorBranchId !== 'COMPANY' && /^[0-9a-fA-F]{24}$/.test(String(creatorBranchId))) {
      bodyData.branchId = String(creatorBranchId);
    }

    const newUser = await createUserForRestaurant(restaurantId, bodyData);
    sendSuccess(res, "User created successfully.", { id: newUser._id });
  } catch (error: any) {
    if (error.message === "Email already registered" || 
        error.message === "Phone number already registered" || 
        error.message === "This branch already has an active manager." || 
        error.message === "This branch already has a Kitchen Station account.") {
        sendError(res, error.message, StatusCodes.CONFLICT);
    } else {
        console.error("createUser Error:", error);
        sendError(res, "Failed to create user: " + error.message, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const userId = req.params.userId as string;
    await updateUserForRestaurant(restaurantId, userId, req.body);
    sendSuccess(res, "User updated successfully.");
  } catch (error: any) {
    if (error.message === "User not found") {
        sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else if (error.message === "This branch already has an active manager.") {
        sendError(res, error.message, StatusCodes.CONFLICT);
    } else {
        sendError(res, "Failed to update user", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const userId = req.params.userId as string;
    await deleteUserForRestaurant(restaurantId, userId);
    sendSuccess(res, "User deleted successfully.");
  } catch (error: any) {
    if (error.message === "User not found") {
        sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else if (error.message === "Cannot delete restaurant owner account") {
        sendError(res, error.message, StatusCodes.FORBIDDEN);
    } else {
        sendError(res, "Failed to delete user", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const userId = req.params.userId as string;
    const { password, newPassword } = req.body;
    const finalPassword = newPassword || password;

    if (!finalPassword) {
      return sendError(res, "Password is required", StatusCodes.BAD_REQUEST);
    }

    await changePasswordForRestaurant(restaurantId, userId, finalPassword);
    sendSuccess(res, "Password updated successfully.");
  } catch (error: any) {
    if (error.message === "User not found") {
        sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else {
        sendError(res, "Failed to update password", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};
