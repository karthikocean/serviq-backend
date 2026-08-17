import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/authMiddleware";
import * as roleService from "../../services/admin/role.service";

export const getRoles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const roles = await roleService.getRolesByRestaurant(restaurantId);
    
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

export const getRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const roleId = req.params.id as string;
    const role = await roleService.getRoleById(roleId, restaurantId);
    
    if (!role) {
      return sendError(res, "Role not found", StatusCodes.NOT_FOUND);
    }

    const roleObj = role.toObject();
    if (roleObj.permissions) {
        roleObj.permissions = Object.fromEntries(roleObj.permissions as any);
    }

    sendSuccess(res, "Role fetched successfully.", roleObj);
  } catch (error: any) {
    sendError(res, "Failed to fetch role", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const createRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const { roleName, permissions } = req.body;
    
    if (!roleName) {
      return sendError(res, "Role name is required.", StatusCodes.BAD_REQUEST);
    }

    const role = await roleService.createRole(restaurantId, roleName, permissions);
    
    sendSuccess(res, "Role created successfully.", role, StatusCodes.CREATED);
  } catch (error: any) {
    if (error.message === "Role name already exists") {
        sendError(res, error.message, StatusCodes.CONFLICT);
    } else {
        console.error("Error creating role:", error);
        sendError(res, "Failed to create role", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const updateRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const roleId = req.params.id as string;
    const { roleName, permissions } = req.body;
    
    const role = await roleService.updateRolePermissions(roleId, restaurantId, roleName, permissions);
    
    sendSuccess(res, "Role updated successfully.", role);
  } catch (error: any) {
    if (error.message === "Role not found") {
        sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else if (error.message === "Cannot edit default system roles directly" || error.message === "Role name already exists") {
        sendError(res, error.message, StatusCodes.CONFLICT);
    } else {
        console.error("Error updating role:", error);
        sendError(res, "Failed to update role", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const deleteRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const roleId = req.params.id as string;
    
    await roleService.deleteRole(roleId, restaurantId);
    
    sendSuccess(res, "Role deleted successfully.");
  } catch (error: any) {
    if (error.message === "Role not found") {
        sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else if (error.message.includes("is assigned to")) {
        sendError(res, error.message, StatusCodes.CONFLICT);
    } else if (error.message === "Cannot delete default system roles") {
        sendError(res, error.message, StatusCodes.FORBIDDEN);
    } else {
        console.error("Error deleting role:", error);
        sendError(res, "Failed to delete role", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};
