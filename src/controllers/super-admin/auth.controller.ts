import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import Admin from "../../models/Admin";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/authMiddleware";

export const superAdminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password) {
      sendError(res, "Phone number and password are required.", StatusCodes.BAD_REQUEST);
      return;
    }

    const admin = await Admin.findOne({ phoneNumber, isDelete: false }).populate("role");

    if (!admin || !admin.canLoginAdmin) {
      sendError(res, "Invalid credentials.", StatusCodes.UNAUTHORIZED);
      return;
    }

    if (!admin.isActive) {
      sendError(res, "Account is inactive.", StatusCodes.FORBIDDEN);
      return;
    }

    // Only "Admin" role can access super-admin routes
    const role = admin.role as any;
    if (role?.roleName !== "Super Admin" || role?.type !== "SUPER_ADMIN") {
      sendError(res, "Access denied. Super admin only.", StatusCodes.FORBIDDEN);
      return;
    }

    const isMatch = await bcrypt.compare(password, admin.password!);
    if (!isMatch) {
      sendError(res, "Invalid credentials.", StatusCodes.UNAUTHORIZED);
      return;
    }

    const token = jwt.sign(
      { id: admin._id, role: admin.role, type: "super-admin" },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as jwt.SignOptions
    );

    sendSuccess(res, "Super admin login successful.", {
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phoneNumber: admin.phoneNumber,
        role: admin.role,
      },
    });
  } catch (error) {
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getSuperAdminProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const admin = await Admin.findById(req.user?.id).select("-password").populate("role");
    if (!admin) {
      sendError(res, "Admin not found.", StatusCodes.NOT_FOUND);
      return;
    }
    sendSuccess(res, "Profile fetched.", admin);
  } catch (error) {
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  sendSuccess(res, "Logged out successfully.");
};
