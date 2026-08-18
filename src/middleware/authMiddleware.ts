import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";

import User from "../models/User";
import Admin from "../models/Admin";
import UserToken from "../models/UserToken";
import Role from "../models/Role";
import Subscription from "../models/Subscription";

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

export const restrictTo = (...allowedTypes: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedTypes.includes(req.user.userType)) {
      res.status(StatusCodes.FORBIDDEN).json({ success: false, message: "You do not have permission to perform this action." });
      return;
    }
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
    const activeToken = await UserToken.findOne({ userId: decodedId, token });
    if (!activeToken) {
        res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "Session expired. Another login detected." });
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
    try {
      const user = req.user;
      if (!user) {
        res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "Unauthorized." });
        return;
      }

      // 1. SUPER_ADMIN bypass
      if (user.userType === 'SUPER_ADMIN') {
        return next();
      }

      // 2. Subscription Check
      const premiumModules = ['menu', 'tables', 'orders', 'waiter-list', 'kitchen-list', 'qr-code-config', 'inventory'];
      if (premiumModules.includes(moduleKey)) {
        const subscription = await Subscription.findOne({ restaurantId: user.restaurantId, isActive: true, isDelete: false });
        if (!subscription) {
          res.status(StatusCodes.PAYMENT_REQUIRED).json({ success: false, message: "No active subscription found." });
          return;
        }

        const hasFeature = (subscription.features as any)?.[moduleKey] === true;
        if (!hasFeature) {
          res.status(StatusCodes.PAYMENT_REQUIRED).json({ 
            success: false, 
            message: `Your current plan does not include access to '${moduleKey}'. Please upgrade your subscription.` 
          });
          return;
        }
      }

      // 3. RESTAURANT_OWNER bypass
      if (user.userType === 'RESTAURANT_OWNER') {
        return next();
      }

      // 4. Role Permission Check for STAFF and BRANCH_ADMIN
      if (!user.roleId) {
        res.status(StatusCodes.FORBIDDEN).json({ success: false, message: "No role assigned. Access denied." });
        return;
      }

      const role = await Role.findById(user.roleId);
      if (!role || role.isDelete || !role.isActive) {
        res.status(StatusCodes.FORBIDDEN).json({ success: false, message: "Role is inactive or deleted. Access denied." });
        return;
      }

      const permissions = role.permissions as any;
      if (!permissions || !permissions.get(moduleKey) || permissions.get(moduleKey)[action] !== true) {
        res.status(StatusCodes.FORBIDDEN).json({ 
          success: false, 
          message: `You do not have permission to ${action} ${moduleKey}.` 
        });
        return;
      }

      // Pass scope check responsibility to controller
      next();
    } catch (error) {
      console.error("checkPermission Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error during authorization." });
    }
  };
};
