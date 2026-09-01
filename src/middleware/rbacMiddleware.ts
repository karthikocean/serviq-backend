import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";
import Subscription from "../models/Subscription";
import User from "../models/User";
import UserRole from "../models/UserRole";

const FEATURE_MAP: Record<string, string> = {
    'MENU': 'menu',
    'TABLE_QR': 'tables',
    'QR': 'qr-code-config',
    'ORDER': 'orders',
    'STAFF': 'waiter-list',
    'KDS': 'kitchen-list'
};

// 1. Check if the Restaurant's Subscription Plan includes a specific feature module
export const checkSubscriptionFeature = (moduleKey: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (req.user?.userType === 'SUPER_ADMIN') {
                return next();
            }

            const restaurantId = req.user?.restaurantId;
            if (!restaurantId) {
                res.status(403).json({ success: false, message: "Restaurant ID not found in session." });
                return;
            }

            // Get active subscription and populate the plan
            const subscription = await Subscription.findOne({
                restaurant: restaurantId,
                status: "Active"
            }).populate("plan");

            if (!subscription) {
                res.status(403).json({ success: false, message: "No active subscription found." });
                return;
            }

            // Check if feature is in plan's featuresIncluded or subscription.features
            const plan = subscription.plan as any;
            const features = plan?.featuresIncluded || subscription.features;
            
            const mappedKey = FEATURE_MAP[moduleKey] || moduleKey;
            const hasFeature = features && features[mappedKey] === true;

            if (!hasFeature) {
                res.status(403).json({ success: false, message: `Your plan does not include access to ${moduleKey}` });
                return;
            }

            next();
        } catch (error) {
            res.status(500).json({ success: false, message: "Error verifying plan features" });
        }
    };
};

// 2. Enforce active branch access
export const checkBranchAccess = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (req.user?.userType === 'SUPER_ADMIN') {
            return next();
        }

        if (req.user?.userType === 'RESTAURANT_OWNER') {
            return next();
        }

        if (!req.user?.activeBranchId) {
            res.status(403).json({ success: false, message: "No active branch selected in session." });
            return;
        }

        // The controller should now use req.user.activeBranchId for all queries
        next();
    } catch (error) {
        res.status(500).json({ success: false, message: "Error verifying branch access" });
    }
};

// 3. Check specific Role permission
export const checkPermission = (moduleKey: string, action: 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'view' | 'add' | 'edit' | 'delete') => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (req.user?.userType === 'SUPER_ADMIN' || req.user?.userType === 'RESTAURANT_OWNER') {
                return next();
            }

            // Branch Admin gets full access within the branch (but plan features are already checked above)
            if (req.user?.userType === 'BRANCH_ADMIN') {
                return next();
            }

            // For STAFF, check Role
            const user = await User.findById(req.user?.userId).populate("roleId");
            if (!user || !user.roleId) {
                res.status(403).json({ success: false, message: "Role not assigned." });
                return;
            }

            const role = user.roleId as any;
            const mappedKey = FEATURE_MAP[moduleKey] || moduleKey;
            const permission = role.permissions ? role.permissions.get(mappedKey) : undefined;

            const actionMap: any = {
                'canView': 'view',
                'canCreate': 'add',
                'canEdit': 'edit',
                'canDelete': 'delete'
            };
            const mappedAction = actionMap[action] || action;

            if (permission && permission[mappedAction] === true) {
                return next();
            }

            res.status(403).json({ success: false, message: "Access denied by role permissions." });
        } catch (error) {
            res.status(500).json({ success: false, message: "Error verifying role permissions" });
        }
    };
};
