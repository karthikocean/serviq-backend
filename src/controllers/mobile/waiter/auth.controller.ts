import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../../../models/User";
import UserRole from "../../../models/UserRole";
import UserToken from "../../../models/UserToken";
import Branch from "../../../models/Branch";
import Restaurant from "../../../models/Restaurant";
import { AuthRequest } from "../../../middleware/authMiddleware";
import { sendSuccess, sendError } from "../../../utils/response";

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, phoneNumber, phone } = req.body;
    const identifier = (email || phoneNumber || phone || "").trim();

    if (!identifier || !password) {
      return sendError(res, "Email or phone number and password are required.", StatusCodes.BAD_REQUEST);
    }

    const cleanIdentifier = identifier.toLowerCase();
    const user = await User.findOne({
      $or: [{ email: cleanIdentifier }, { phoneNumber: identifier }],
      isDelete: false
    }).populate("roleId");

    if (!user) {
      return sendError(res, "Invalid credentials.", StatusCodes.UNAUTHORIZED);
    }

    if (!user.isActive) {
      return sendError(res, "Account is deactivated. Please contact admin.", StatusCodes.FORBIDDEN);
    }

    if (user.userType !== 'STAFF' && (user.userType as any) !== 'WAITER') {
      return sendError(res, "Access restricted to Waiter Staff only.", StatusCodes.FORBIDDEN);
    }

    if (!user.roleId) {
      return sendError(res, "No role assigned to this user.", StatusCodes.FORBIDDEN);
    }

    const role = user.roleId as any;
    const roleCode = (role.code || '').toUpperCase().trim();
    const roleName = (role.roleName || role.name || '').toUpperCase().trim();
    if (roleCode !== 'WAITER' && !roleName.includes('WAITER')) {
      return sendError(res, "You are not authorized as a Waiter.", StatusCodes.FORBIDDEN);
    }

    if (!user.branchId) {
      return sendError(res, "You are not assigned to any branch.", StatusCodes.FORBIDDEN);
    }

    const branch = await Branch.findById(user.branchId);
    if (!branch || branch.isDelete || !branch.isActive || branch.status === 'Inactive' || branch.status !== 'Active') {
      return sendError(res, "Your assigned branch is currently inactive. Please contact your restaurant owner.", StatusCodes.FORBIDDEN);
    }

    if (user.restaurantId) {
      const restaurant = await Restaurant.findById(user.restaurantId);
      if (restaurant && (!restaurant.isActive || restaurant.isDelete)) {
        return sendError(res, "Your restaurant account has been deactivated. Please contact support.", StatusCodes.FORBIDDEN);
      }
    }

    const isMatch = await bcrypt.compare(password, user.password as string);
    if (!isMatch) {
      return sendError(res, "Invalid password.", StatusCodes.UNAUTHORIZED);
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
  } catch (error: any) {
    console.error("Waiter Login Error:", error);
    sendError(res, error?.message || "Failed to login. Please try again.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      await UserToken.deleteOne({ token });
    }
    sendSuccess(res, "Logged out successfully.");
  } catch (error: any) {
    console.error("Waiter Logout Error:", error);
    sendError(res, error?.message || "Failed to logout.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
