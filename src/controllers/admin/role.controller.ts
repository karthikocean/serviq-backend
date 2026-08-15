import { getTargetBranchId } from "../../utils/authUtils";
import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/authMiddleware";
import { getRolesByRestaurant, updateRolePermissions } from "../../services/admin/role.service";

export const getRoles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const roles = await getRolesByRestaurant(restaurantId);
    
    // Transform permissions Map back to plain object for response
    const formattedRoles = roles.map(role => {
        const roleObj = role.toObject();
        if (roleObj.permissions) {
            roleObj.permissions = Object.fromEntries(roleObj.permissions as any);
        }
        return roleObj;
    });

    sendSuccess(res, "Roles fetched successfully.", formattedRoles);
  } catch (error: any) {
    sendError(res, "Failed to fetch roles", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const updateRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const roleName = req.params.roleName as string;
    const { permissions } = req.body;
    
    await updateRolePermissions(roleName, restaurantId, permissions);
    
    sendSuccess(res, "Permissions updated successfully.");
  } catch (error: any) {
    if (error.message === "Role not found") {
        sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else {
        sendError(res, "Failed to update role", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};
