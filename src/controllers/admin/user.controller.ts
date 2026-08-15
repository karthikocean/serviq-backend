import { getTargetBranchId } from "../../utils/authUtils";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/authMiddleware";
import { getUsersByRestaurantId, createUserForRestaurant, updateUserForRestaurant, deleteUserForRestaurant } from "../../services/admin/user.service";

export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const branchId = req.query.branchId as string;
    const users = await getUsersByRestaurantId(restaurantId, branchId);
    
    sendSuccess(res, "Users fetched successfully.", users);
  } catch (error: any) {
    sendError(res, "Failed to fetch users", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const newUser = await createUserForRestaurant(restaurantId, req.body);
    sendSuccess(res, "User created successfully.", { id: newUser._id });
  } catch (error: any) {
    if (error.message === "Email already registered") {
        sendError(res, error.message, StatusCodes.CONFLICT);
    } else {
        sendError(res, "Failed to create user", StatusCodes.INTERNAL_SERVER_ERROR);
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
