import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/authMiddleware";
import { loginAdmin, getAdminProfile, logoutAdmin, updateAdminPassword } from "../../services/admin/auth.service";

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const result = await loginAdmin(email, password);
    sendSuccess(res, "Login successful.", result);
  } catch (error: any) {
    if (error.message === "Invalid mail" || error.message === "Invalid password") {
      sendError(res, error.message, StatusCodes.UNAUTHORIZED);
    } else if (error.message.includes("Account is inactive") || error.message.includes("Your branch is currently inactive")) {
      sendError(res, error.message, StatusCodes.FORBIDDEN);
    } else {
      sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);
      return;
    }
    const user = await getAdminProfile(req.user.userId);
    sendSuccess(res, "Profile fetched.", user);
  } catch (error: any) {
    if (error.message === "User not found.") {
      sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else {
      sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token && req.user?.userId) {
      await logoutAdmin(req.user.userId, token);
    }
    sendSuccess(res, "Logged out successfully.");
  } catch (error) {
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const updatePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);
      return;
    }
    const { currentPassword, newPassword } = req.body;
    await updateAdminPassword(req.user.userId, currentPassword, newPassword);
    sendSuccess(res, "Password updated successfully.");
  } catch (error: any) {
    if (error.message === "Incorrect current password.") {
      sendError(res, error.message, StatusCodes.BAD_REQUEST);
    } else if (error.message === "User not found.") {
      sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else {
      sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};
