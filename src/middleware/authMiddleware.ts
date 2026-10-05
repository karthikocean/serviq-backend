import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";

import User from "../models/User";
import Admin from "../models/Admin";
import SuperAdmin from "../models/SuperAdmin";
import SuperAdminUser from "../models/SuperAdminUser";
import AdminRole from "../models/AdminRole";
import UserRole from "../models/UserRole";
import Subscription from "../models/Subscription";
import Branch from "../models/Branch";
import Restaurant from "../models/Restaurant";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    userType: 'SUPER_ADMIN' | 'RESTAURANT_OWNER' | 'BRANCH_ADMIN' | 'STAFF' | 'STATION';
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

    if (decoded.userType === 'SUPER_ADMIN' || decoded.type === 'super-admin') {
        const restaurantId = (req.headers['x-restaurant-id'] || req.query.restaurantId || decoded.restaurantId) as string;
        req.user = {
            userId: decodedId,
            userType: 'SUPER_ADMIN',
            restaurantId: restaurantId || '',
            activeBranchId: (req.query.branchId || req.body?.branchId || decoded.activeBranchId) as string
        };
        return next();
    }
    
    let user = await Admin.findById(decodedId);
    if (!user) {
        user = await User.findById(decodedId);
    }

    if (!user || user.isDelete) {
        console.log(`[protectAdmin] 401: User not found or deleted. decodedId=${decodedId}, decodedType=${decoded.userType}`);
        res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "User not found or deleted." });
        return;
    }
    if (!user.isActive) {
        console.log(`[protectAdmin] 401: User is deactivated. decodedId=${decodedId}`);
        res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "Your account is inactive" });
        return;
    }
    
    // Check context
    if (!user.restaurantId) {
        res.status(StatusCodes.FORBIDDEN).json({ success: false, message: "No restaurant context found for user." });
        return;
    }

    const restaurant = await Restaurant.findById(user.restaurantId);
    if (restaurant && (!restaurant.isActive || restaurant.isDelete)) {
        res.status(StatusCodes.FORBIDDEN).json({ success: false, message: "Your restaurant account has been deactivated. Please contact the Super Admin." });
        return;
    }

    let branchId = decoded.activeBranchId || user.branchId?.toString();
 
    if (user.userType === 'RESTAURANT_OWNER') {
        const requestedBranchId = req.query.branchId || req.body?.branchId;
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
  } catch (error: any) {
    console.error("protectAdmin Error:", error);
    res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "Invalid token.", error: error?.message || String(error), stack: error?.stack });
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
    // const activeToken = await UserToken.findOne({ userId: decodedId, token });
    // if (!activeToken) {
    //     res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "Session expired. Another login detected." });
    //     return;
    // }

    if (decoded.userType !== 'SUPER_ADMIN' && decoded.type !== 'super-admin') {
        res.status(StatusCodes.FORBIDDEN).json({ success: false, message: "Super Admin access required." });
        return;
    }
    let admin = await SuperAdmin.findById(decodedId);
    if (!admin) {
        admin = await SuperAdminUser.findById(decodedId) as any;
    }
    if (!admin || admin.isDelete) {
        res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "Admin not found or deleted." });
        return;
    }
    if (!admin.isActive || !admin.canLoginAdmin) {
        res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "Admin account is deactivated." });
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

export const restrictTo = (...allowedTypes: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    next();
  };
};

export const protectMobile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "No token provided." });
    return;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    
    const decodedId = decoded.userId || decoded.id;
    // const activeToken = await UserToken.findOne({ userId: decodedId, token });
    // if (!activeToken) {
    //     res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "Session expired. Another login detected." });
    //     return;
    // }

    const user = await User.findById(decodedId);
    if (!user || user.isDelete) {
        res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "User not found or deleted." });
        return;
    }
    if (!user.isActive) {
        res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "Account is deactivated." });
        return;
    }
    
    // Check context
    if (!user.restaurantId) {
        res.status(StatusCodes.FORBIDDEN).json({ success: false, message: "No restaurant context found for user." });
        return;
    }

    const restaurant = await Restaurant.findById(user.restaurantId);
    if (restaurant && (!restaurant.isActive || restaurant.isDelete)) {
        res.status(StatusCodes.FORBIDDEN).json({ success: false, message: "Your restaurant account has been deactivated. Please contact the Super Admin." });
        return;
    }

    if (!user.branchId) {
        res.status(StatusCodes.FORBIDDEN).json({ success: false, message: "No branch context found for user." });
        return;
    }

    if (user.userType !== 'STAFF' && user.userType !== 'STATION') {
        res.status(StatusCodes.FORBIDDEN).json({ success: false, message: "Mobile access is restricted to Staff and Stations only." });
        return;
    }

    req.user = {
       userId: user._id.toString(),
       userType: user.userType,
       restaurantId: user.restaurantId.toString(),
       activeBranchId: user.branchId.toString(),
       roleId: user.roleId?.toString()
    };
    next();
  } catch (error: any) {
    console.error("protectMobile Error:", error);
    res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "Invalid token.", error: error?.message || String(error) });
  }
};

export const checkPermission = (moduleKey: string, action: 'view' | 'add' | 'edit' | 'delete') => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    next();
  };
};
