import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../../../models/User";
import Role from "../../../models/Role";
import UserToken from "../../../models/UserToken";
import { AuthRequest } from "../../../middleware/authMiddleware";
import { sendSuccess, sendError } from "../../../utils/response";

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, "Email and password are required.", StatusCodes.BAD_REQUEST);
    }

    const user = await User.findOne({ email, isDelete: false }).populate("roleId");
    if (!user) {
      return sendError(res, "Invalid email or password.", StatusCodes.UNAUTHORIZED);
    }

    if (!user.isActive) {
      return sendError(res, "Account is deactivated. Please contact admin.", StatusCodes.FORBIDDEN);
    }

    if (user.userType !== 'STAFF') {
      return sendError(res, "Access restricted to Waiter Staff only.", StatusCodes.FORBIDDEN);
    }

    if (!user.roleId) {
      return sendError(res, "No role assigned to this user.", StatusCodes.FORBIDDEN);
    }

    const role = user.roleId as any;
    if (role.roleName?.toUpperCase() !== 'WAITER') {
      return sendError(res, "You are not authorized as a Waiter.", StatusCodes.FORBIDDEN);
    }

    if (!user.branchId) {
      return sendError(res, "You are not assigned to any branch.", StatusCodes.FORBIDDEN);
    }

    const isMatch = await bcrypt.compare(password, user.password as string);
    if (!isMatch) {
      return sendError(res, "Invalid email or password.", StatusCodes.UNAUTHORIZED);
    }

    const token = jwt.sign(
      {
        userId: user._id,
        userType: user.userType,
        activeBranchId: user.branchId,
        restaurantId: user.restaurantId
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    // Track active token
    await UserToken.create({
      userId: user._id,
      token
    });

    sendSuccess(res, "Waiter logged in successfully.", {
      token,
      user: {
        id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        email: user.email,
        branchId: user.branchId,
        role: role.name
      }
    });
  } catch (error) {
    console.error("Waiter Login Error:", error);
    sendError(res, "Failed to login. Please try again.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      await UserToken.deleteOne({ token });
    }
    sendSuccess(res, "Logged out successfully.");
  } catch (error) {
    console.error("Waiter Logout Error:", error);
    sendError(res, "Failed to logout.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
