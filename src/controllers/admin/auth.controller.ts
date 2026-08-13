import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import User from "../../models/User";
import Branch from "../../models/Branch";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/authMiddleware";

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password) {
      sendError(res, "Phone number and password are required.", StatusCodes.BAD_REQUEST);
      return;
    }

    const user = await User.findOne({ phoneNumber, isDelete: false }).populate("roleId");

    if (!user) {
      sendError(res, "Invalid credentials.", StatusCodes.UNAUTHORIZED);
      return;
    }

    if (!user.isActive) {
      sendError(res, "Account is inactive. Contact support.", StatusCodes.FORBIDDEN);
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password!);
    if (!isMatch) {
      sendError(res, "Invalid credentials.", StatusCodes.UNAUTHORIZED);
      return;
    }

    let activeBranchId = user.branchId;

    if (user.userType === 'RESTAURANT_OWNER') {
        const mainBranch = await Branch.findOne({ restaurantId: user.restaurantId, isMainBranch: true });
        if (mainBranch) {
            activeBranchId = mainBranch._id as any;
        }
    }

    const token = jwt.sign(
      { 
        userId: user._id, 
        userType: user.userType, 
        restaurantId: user.restaurantId,
        activeBranchId: activeBranchId
      },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as jwt.SignOptions
    );

    sendSuccess(res, "Login successful.", {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        userType: user.userType,
        restaurantId: user.restaurantId,
        activeBranchId: activeBranchId,
        role: user.roleId,
      },
    });
  } catch (error) {
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId).select("-password").populate("roleId");
    if (!user) {
      sendError(res, "User not found.", StatusCodes.NOT_FOUND);
      return;
    }
    sendSuccess(res, "Profile fetched.", user);
  } catch (error) {
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  // Stateless JWT — client removes token
  sendSuccess(res, "Logged out successfully.");
};

export const switchBranch = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (req.user?.userType !== 'RESTAURANT_OWNER') {
            sendError(res, "Only Restaurant Owners can switch branches.", StatusCodes.FORBIDDEN);
            return;
        }

        const { branchId } = req.body;
        if (!branchId) {
            sendError(res, "branchId is required.", StatusCodes.BAD_REQUEST);
            return;
        }

        const branch = await Branch.findOne({ _id: branchId, restaurantId: req.user.restaurantId, isDelete: false });
        if (!branch) {
            sendError(res, "Branch not found or unauthorized.", StatusCodes.NOT_FOUND);
            return;
        }

        const token = jwt.sign(
            { 
                userId: req.user.userId, 
                userType: req.user.userType, 
                restaurantId: req.user.restaurantId,
                activeBranchId: branchId
            },
            process.env.JWT_SECRET as string,
            { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as jwt.SignOptions
        );

        sendSuccess(res, "Branch switched successfully.", { token, activeBranchId: branchId });
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};
