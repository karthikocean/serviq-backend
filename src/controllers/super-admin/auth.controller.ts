import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import Admin from "../../models/Admin";
import UserToken from "../../models/UserToken";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/authMiddleware";

export const superAdminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      sendError(res, "Email and password are required.", StatusCodes.BAD_REQUEST);
      return;
    }

    const admin = await Admin.findOne({ email, isDelete: false }).populate("role");

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

    let finalToken: string;
    const existingToken = await UserToken.findOne({ userId: admin._id });

    if (existingToken) {
        try {
            jwt.verify(existingToken.token, process.env.JWT_SECRET as string);
            finalToken = existingToken.token;
        } catch (error) {
            finalToken = jwt.sign(
              { id: admin._id, role: admin.role, type: "super-admin" },
              process.env.JWT_SECRET as string,
              { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as jwt.SignOptions
            );
            existingToken.token = finalToken;
            await existingToken.save();
        }
    } else {
        finalToken = jwt.sign(
          { id: admin._id, role: admin.role, type: "super-admin" },
          process.env.JWT_SECRET as string,
          { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as jwt.SignOptions
        );
        await UserToken.create({ userId: admin._id, token: finalToken });
    }

    sendSuccess(res, "Super admin login successful.", {
      token: finalToken,
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
    const admin = await Admin.findById(req.user?.userId).select("-password").populate("role");
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
  const token = req.headers.authorization?.split(" ")[1];
  if (token) {
    const userId = req.user?.userId || req.user?.id;
    await UserToken.findOneAndDelete({ userId, token });
  }
  sendSuccess(res, "Logged out successfully.");
};

export const updateSuperAdminProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, phoneNumber } = req.body;
    const admin = await Admin.findById(req.user?.userId);
    if (!admin) {
      sendError(res, "Admin not found.", StatusCodes.NOT_FOUND);
      return;
    }
    if (name) admin.name = name;
    if (email) admin.email = email;
    if (phoneNumber) admin.phoneNumber = phoneNumber;
    
    await admin.save();
    
    const updatedAdmin = await Admin.findById(req.user?.userId).select("-password").populate("role");
    sendSuccess(res, "Profile updated successfully.", updatedAdmin);
  } catch (error) {
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const updateSuperAdminPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      sendError(res, "Current and new passwords are required.", StatusCodes.BAD_REQUEST);
      return;
    }
    
    const admin = await Admin.findById(req.user?.userId);
    if (!admin) {
      sendError(res, "Admin not found.", StatusCodes.NOT_FOUND);
      return;
    }
    
    const isMatch = await bcrypt.compare(currentPassword, admin.password!);
    if (!isMatch) {
      sendError(res, "Incorrect current password.", StatusCodes.BAD_REQUEST);
      return;
    }
    
    admin.password = newPassword; 
    await admin.save();
    
    sendSuccess(res, "Password updated successfully.");
  } catch (error) {
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
