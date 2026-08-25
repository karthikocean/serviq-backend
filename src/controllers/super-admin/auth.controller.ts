import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import SuperAdmin from "../../models/SuperAdmin";
import SuperAdminUser from "../../models/SuperAdminUser";
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

    const cleanIdentifier = email ? email.trim() : "";
    const normalizedEmail = cleanIdentifier.toLowerCase();

    let admin = await SuperAdmin.findOne({
      $or: [{ email: normalizedEmail }, { phoneNumber: cleanIdentifier }],
      isDelete: false
    }).populate("role");
    let isSuperOwner = true;

    if (!admin) {
      admin = await SuperAdminUser.findOne({
        $or: [{ email: normalizedEmail }, { phoneNumber: cleanIdentifier }],
        isDelete: false
      }).populate("role") as any;
      isSuperOwner = false;
    }

    if (!admin || !admin.canLoginAdmin) {
      sendError(res, "Invalid credentials.", StatusCodes.UNAUTHORIZED);
      return;
    }

    if (!admin.isActive) {
      sendError(res, "Account is inactive.", StatusCodes.FORBIDDEN);
      return;
    }

    // Validate active role is assigned (skip check for superOwner root admin)
    if (!isSuperOwner) {
      const role = admin.role as any;
      if (!role || role.isDelete || !role.isActive) {
        sendError(res, "Access denied. Active role required.", StatusCodes.FORBIDDEN);
        return;
      }
    }

    let isMatch = false;
    if (admin.password) {
      if (admin.password.startsWith("$2a$") || admin.password.startsWith("$2b$")) {
        isMatch = await bcrypt.compare(password, admin.password);
      } else {
        isMatch = (password === admin.password);
        if (isMatch) {
          admin.password = password;
          await admin.save();
        }
      }
    }

    if (!isMatch) {
      sendError(res, "Invalid credentials.", StatusCodes.UNAUTHORIZED);
      return;
    }

    // Always generate a fresh token with up-to-date payload
    const finalToken = jwt.sign(
      { id: admin._id, userId: admin._id, role: admin.role, type: "super-admin", userType: "SUPER_ADMIN" },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as jwt.SignOptions
    );

    const existingToken = await UserToken.findOne({ userId: admin._id });
    if (existingToken) {
      existingToken.token = finalToken;
      await existingToken.save();
    } else {
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
    let admin = await SuperAdmin.findById(req.user?.userId).select("-password").populate("role");
    let isSuperOwner = true;
    if (!admin) {
      admin = await SuperAdminUser.findById(req.user?.userId).select("-password").populate("role") as any;
      isSuperOwner = false;
    }
    if (!admin || admin.isDelete) {
      sendError(res, "Admin not found.", StatusCodes.NOT_FOUND);
      return;
    }

    // Check if user account is inactive
    if (!admin.isActive) {
      res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: "Your account has been deactivated.",
        code: "USER_INACTIVE"
      });
      return;
    }

    // Check if assigned role is active (skip check for superOwner)
    if (!isSuperOwner) {
      const role = admin.role as any;
      if (!role || role.isDelete || !role.isActive) {
        res.status(StatusCodes.FORBIDDEN).json({
          success: false,
          message: "Your role has been deactivated. Please contact the administrator.",
          code: "ROLE_INACTIVE"
        });
        return;
      }
    }

    // Build the profile object and convert Mongoose Map permissions to plain object
    const adminObj = admin.toObject() as any;

    if (adminObj.role && adminObj.role.permissions) {
      const perms = adminObj.role.permissions;
      if (perms instanceof Map) {
        const permsObj: Record<string, any> = {};
        perms.forEach((val: any, key: string) => { permsObj[key] = val; });
        adminObj.role.permissions = permsObj;
      } else if (typeof perms === 'object' && !(perms instanceof Map)) {
        // Could be a plain object already from toObject() — ensure it's serializable
        adminObj.role.permissions = JSON.parse(JSON.stringify(perms));
      }
    }

    sendSuccess(res, "Profile fetched.", { ...adminObj, isSuperOwner });
  } catch (error) {
    console.error("getSuperAdminProfile error:", error);
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
    let admin = await SuperAdmin.findById(req.user?.userId);
    let isSuperAdmin = true;
    if (!admin) {
      admin = await SuperAdminUser.findById(req.user?.userId) as any;
      isSuperAdmin = false;
    }
    if (!admin) {
      sendError(res, "Admin not found.", StatusCodes.NOT_FOUND);
      return;
    }
    if (name) admin.name = name;
    if (email) admin.email = email;
    if (phoneNumber) admin.phoneNumber = phoneNumber;
    
    await admin.save();
    
    const updatedAdmin = isSuperAdmin
      ? await SuperAdmin.findById(req.user?.userId).select("-password").populate("role")
      : await SuperAdminUser.findById(req.user?.userId).select("-password").populate("role");
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
    
    let admin = await SuperAdmin.findById(req.user?.userId);
    if (!admin) {
      admin = await SuperAdminUser.findById(req.user?.userId) as any;
    }
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
