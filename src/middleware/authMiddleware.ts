import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";

import User from "../models/User";
import Admin from "../models/Admin";
import UserToken from "../models/UserToken";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    userType: 'SUPER_ADMIN' | 'RESTAURANT_OWNER' | 'BRANCH_ADMIN' | 'STAFF';
    restaurantId?: string;
    activeBranchId?: string;
    roleId?: string;
    [key: string]: any;
  };
}

export const protectAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "No token provided." });
    return;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    
    const decodedId = decoded.userId || decoded.id;
    const activeToken = await UserToken.findOne({ userId: decodedId, token });
    if (!activeToken) {
        res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "Session expired. Another login detected." });
        return;
    }

    if (decoded.userType === 'SUPER_ADMIN' || decoded.type === 'super-admin') {
        res.status(StatusCodes.FORBIDDEN).json({ success: false, message: "Super Admin cannot access tenant routes directly." });
        return;
    }
    
    const user = await User.findById(decodedId);
    if (!user || user.isDelete) {
        res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "User not found or deleted." });
        return;
    }
    if (!user.isActive) {
        res.status(StatusCodes.FORBIDDEN).json({ success: false, message: "Account is deactivated." });
        return;
    }
    
    // Check context
    if (!user.restaurantId) {
        res.status(StatusCodes.FORBIDDEN).json({ success: false, message: "No restaurant context found for user." });
        return;
    }

    let branchId = decoded.activeBranchId || user.branchId?.toString();
    
    // Allow RESTAURANT_OWNER to override branch via request payload (Stateless branch switching)
    if (user.userType === 'RESTAURANT_OWNER') {
        const requestedBranchId = req.query.branchId || req.body.branchId;
        if (requestedBranchId) {
            branchId = requestedBranchId as string;
        }
    }

    req.user = {
       userId: user._id.toString(),
       userType: user.userType,
       restaurantId: user.restaurantId.toString(),
       activeBranchId: branchId,
       roleId: user.roleId?.toString()
    };
    next();
  } catch {
    res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "Invalid token." });
  }
};

export const protectSuperAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "No token provided." });
    return;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    
    const decodedId = decoded.userId || decoded.id;
    const activeToken = await UserToken.findOne({ userId: decodedId, token });
    if (!activeToken) {
        res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "Session expired. Another login detected." });
        return;
    }

    if (decoded.userType !== 'SUPER_ADMIN' && decoded.type !== 'super-admin') {
        res.status(StatusCodes.FORBIDDEN).json({ success: false, message: "Super Admin access required." });
        return;
    }
    const admin = await Admin.findById(decodedId);
    if (!admin || admin.isDelete) {
        res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "Admin not found or deleted." });
        return;
    }
    if (!admin.isActive || !admin.canLoginAdmin) {
        res.status(StatusCodes.FORBIDDEN).json({ success: false, message: "Admin account is deactivated." });
        return;
    }

    req.user = {
       userId: admin._id.toString(),
       userType: 'SUPER_ADMIN',
    };
    next();
  } catch {
    res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "Invalid token." });
  }
};
