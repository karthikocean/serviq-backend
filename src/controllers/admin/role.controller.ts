import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/authMiddleware";
import * as roleService from "../../services/admin/role.service";

export const getRoles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const { search, searchQuery, searchTerm, status, adminAccess, page, limit } = req.query;
    const searchVal = (search || searchQuery || searchTerm) as string | undefined;
    const adminAccessBool = adminAccess !== undefined ? adminAccess === "true" || adminAccess === "1" : undefined;

    const roles = await roleService.getRolesByRestaurant(restaurantId.toString(), {
      search: searchVal,
      status: status as string | undefined,
      adminAccess: adminAccessBool,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    sendSuccess(res, "Roles fetched successfully.", roles);
  } catch (error: any) {
    sendError(res, error?.message || "Failed to fetch roles", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const roleId = req.params.id as string;
    const role = await roleService.getRoleById(roleId, restaurantId.toString());

    if (!role) {
      return sendError(res, "Role not found", StatusCodes.NOT_FOUND);
    }

    sendSuccess(res, "Role fetched successfully.", role);
  } catch (error: any) {
    sendError(res, error?.message || "Failed to fetch role", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const createRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const { roleName, permissions, adminAccess, isAdminAccess, isActive, status } = req.body;

    if (!roleName || !roleName.trim()) {
      return sendError(res, "Role name is required.", StatusCodes.BAD_REQUEST);
    }

    const role = await roleService.createRole(restaurantId.toString(), {
      roleName,
      permissions,
      adminAccess,
      isAdminAccess,
      isActive,
      status
    });

    sendSuccess(res, "Role created successfully.", role, StatusCodes.CREATED);
  } catch (error: any) {
    if (error.message === "Role name already exists") {
      sendError(res, error.message, StatusCodes.CONFLICT);
    } else {
      console.error("Error creating role:", error);
      sendError(res, error?.message || "Failed to create role", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const updateRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const roleId = req.params.id as string;
    const { roleName, permissions, adminAccess, isAdminAccess, isActive, status } = req.body;

    const role = await roleService.updateRolePermissions(roleId, restaurantId.toString(), {
      roleName,
      permissions,
      adminAccess,
      isAdminAccess,
      isActive,
      status
    });

    sendSuccess(res, "Role updated successfully.", role);
  } catch (error: any) {
    if (error.message === "Role not found") {
      sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else if (error.message === "Cannot rename default system roles" || error.message === "Role name already exists") {
      sendError(res, error.message, StatusCodes.CONFLICT);
    } else {
      console.error("Error updating role:", error);
      sendError(res, error?.message || "Failed to update role", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const deleteRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const roleId = req.params.id as string;

    await roleService.deleteRole(roleId, restaurantId.toString());

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
      sendError(res, error?.message || "Failed to delete role", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const seedDefaultRoles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    await roleService.seedDefaultRoles(restaurantId.toString());
    const roles = await roleService.getRolesByRestaurant(restaurantId.toString());

    sendSuccess(res, "Default roles seeded successfully.", roles);
  } catch (error: any) {
    sendError(res, error?.message || "Failed to seed default roles", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
