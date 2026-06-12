import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/authMiddleware";

export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Add your dashboard stats queries here
    const stats = {
      message: "Welcome to Admin Dashboard",
      adminId: req.user?.id,
    };
    sendSuccess(res, "Dashboard data fetched.", stats);
  } catch (error) {
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
