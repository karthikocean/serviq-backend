import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import SuperAdminRole from "../../models/SuperAdminRole";
import Module from "../../models/Module";
import { sendSuccess, sendError } from "../../utils/response";
import { pagination } from "../../utils/pagination";

// GET all roles
export const getAllRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const pageIndex = Math.max(0, page);
    const skip = pageIndex * limit;

    const query: any = { isDelete: false };
    if (search) {
      query.roleName = { $regex: search, $options: "i" };
    }

    const total = await SuperAdminRole.countDocuments(query);

    const roles = await SuperAdminRole.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Convert Mongoose Map permissions to plain objects for JSON serialization
    const rolesData = roles.map((role) => {
      const obj = role.toObject();
      if (obj.permissions instanceof Map) {
        const permsObj: Record<string, any> = {};
        obj.permissions.forEach((val: any, key: string) => { permsObj[key] = val; });
        obj.permissions = permsObj;
      }
      return obj;
    });
      
    pagination(total, rolesData, limit, pageIndex, res, "Roles fetched.");
  } catch (error: any) {
    console.error("getAllRoles error:", error);
    sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// POST create role
export const createRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roleName, permissions, isActive } = req.body;

    if (!roleName) {
      sendError(res, "Role name is required.", StatusCodes.BAD_REQUEST);
      return;
    }

    const existing = await SuperAdminRole.findOne({ roleName, isDelete: false });
    if (existing) {
      sendError(res, "Role already exists.", StatusCodes.CONFLICT);
      return;
    }

    // permissions must be an object (module key → {view,add,edit,delete}), not an array
    const permsPayload = permissions && typeof permissions === 'object' && !Array.isArray(permissions)
      ? permissions
      : {};

    const role = await SuperAdminRole.create({
      roleName,
      permissions: permsPayload,
      isActive: isActive !== undefined ? isActive : true,
      isDelete: false,
    });
    sendSuccess(res, "Role created.", { id: role._id }, StatusCodes.CREATED);
  } catch (error: any) {
    console.error("createRole error:", error);
    sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// PUT update role
export const updateRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { roleName, permissions, isActive } = req.body;

    const role = await SuperAdminRole.findOne({ _id: id, isDelete: false });
    if (!role) {
      sendError(res, "Role not found.", StatusCodes.NOT_FOUND);
      return;
    }

    if (roleName) role.roleName = roleName;
    if (isActive !== undefined) role.isActive = isActive;

    // Only update permissions if provided and valid (object, not array)
    if (permissions && typeof permissions === 'object' && !Array.isArray(permissions)) {
      role.permissions = permissions as any;
    }

    await role.save();

    // Return the saved role with permissions as plain object
    const saved = role.toObject();
    if (saved.permissions instanceof Map) {
      const permsObj: Record<string, any> = {};
      (saved.permissions as Map<string, any>).forEach((val, key) => { permsObj[key] = val; });
      saved.permissions = permsObj as any;
    }

    sendSuccess(res, "Role updated.", saved);
  } catch (error: any) {
    console.error("updateRole error:", error);
    sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// DELETE soft delete role
export const deleteRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const role = await SuperAdminRole.findOne({ _id: id, isDelete: false });
    if (!role) {
      sendError(res, "Role not found.", StatusCodes.NOT_FOUND);
      return;
    }
    role.isDelete = true;
    await role.save();
    sendSuccess(res, "Role deleted.");
  } catch (error: any) {
    sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// GET all modules (for role permission setup)
export const getAllModules = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 100;
    const pageIndex = Math.max(0, page);
    const skip = pageIndex * limit;

    const total = await Module.countDocuments();

    const modules = await Module.find()
      .sort({ order: 1 })
      .skip(skip)
      .limit(limit);
      
    pagination(total, modules, limit, pageIndex, res, "Modules fetched.");
  } catch (error: any) {
    sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
