import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";

export const checkSubscriptionFeature = (moduleKey: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        next();
    };
};

export const checkBranchAccess = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    next();
};

export const checkPermission = (moduleKey: string, action: 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'view' | 'add' | 'edit' | 'delete') => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        next();
    };
};

