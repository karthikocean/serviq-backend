import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import User from "../../../models/User";
import { AuthRequest } from "../../../middleware/authMiddleware";
import { sendSuccess, sendError } from "../../../utils/response";

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId)
      .select("-password")
      .populate("roleId", "name permissions")
      .populate("branchId", "name location");

    if (!user) {
      return sendError(res, "User not found.", StatusCodes.NOT_FOUND);
    }

    sendSuccess(res, "Profile fetched successfully.", {
      id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      profileImage: user.profileImage,
      dutyStatus: user.dutyStatus,
      branch: user.branchId,
      role: user.roleId
    });
  } catch (error) {
    console.error("Waiter Profile Error:", error);
    sendError(res, "Failed to fetch profile.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
