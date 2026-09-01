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

    const branchId = req.query.branchId as string;
    const search = req.query.search as string;
    const roleFilter = req.query.roleFilter as string;
    const statusFilter = req.query.statusFilter as string;
    
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;
    const pageIndex = Math.max(0, page);
    const skip = pageIndex * limit;

    const { total, users } = await getUsersByRestaurantId(restaurantId, branchId, search, roleFilter, statusFilter, skip, limit);
    
    pagination(total, users, limit, pageIndex, res, "Users fetched successfully.");
  } catch (error: any) {
    sendError(res, "Failed to fetch users", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getStations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const branchId = req.query.branchId as string;
    
    const { data } = await getStationsByRestaurantId(restaurantId, branchId);
    
    sendSuccess(res, "Station users fetched successfully.", data);
  } catch (error: any) {
    sendError(res, "Failed to fetch station users", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const newUser = await createUserForRestaurant(restaurantId, req.body);
    sendSuccess(res, "User created successfully.", { id: newUser._id });
  } catch (error: any) {
    if (error.message === "Email already registered" || 
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
    const { password } = req.body;

    if (!password) {
      return sendError(res, "Password is required", StatusCodes.BAD_REQUEST);
    }

    await changePasswordForRestaurant(restaurantId, userId, password);
    sendSuccess(res, "Password updated successfully.");
  } catch (error: any) {
    if (error.message === "User not found") {
        sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else {
        sendError(res, "Failed to update password", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};
