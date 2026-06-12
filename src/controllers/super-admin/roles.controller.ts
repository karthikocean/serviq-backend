import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Role from "../../models/Role";
import Module from "../../models/Module";
import { sendSuccess, sendError } from "../../utils/response";

// GET all roles
export const getAllRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const roles = await Role.find({ isDelete: false })
      .populate("permissions.module")
      .sort({ createdAt: -1 });
    sendSuccess(res, "Roles fetched.", roles);
  } catch (error) {
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// POST create role
export const createRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roleName, permissions } = req.body;

    if (!roleName) {
      sendError(res, "Role name is required.", StatusCodes.BAD_REQUEST);
      return;
    }

    const existing = await Role.findOne({ roleName, isDelete: false });
    if (existing) {
      sendError(res, "Role already exists.", StatusCodes.CONFLICT);
      return;
    }

    const role = await Role.create({ roleName, permissions: permissions || [], isActive: true, isDelete: false });
    sendSuccess(res, "Role created.", { id: role._id }, StatusCodes.CREATED);
  } catch (error) {
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// PUT update role
export const updateRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { roleName, permissions, isActive } = req.body;

    const role = await Role.findOne({ _id: id, isDelete: false });
    if (!role) {
      sendError(res, "Role not found.", StatusCodes.NOT_FOUND);
      return;
    }

    if (roleName) role.roleName = roleName;
    if (permissions) role.permissions = permissions;
    if (isActive !== undefined) role.isActive = isActive;

    await role.save();
    sendSuccess(res, "Role updated.");
  } catch (error) {
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// DELETE soft delete role
export const deleteRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const role = await Role.findOne({ _id: id, isDelete: false });
    if (!role) {
      sendError(res, "Role not found.", StatusCodes.NOT_FOUND);
      return;
    }
    role.isDelete = true;
    await role.save();
    sendSuccess(res, "Role deleted.");
  } catch (error) {
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// GET all modules (for role permission setup)
export const getAllModules = async (req: Request, res: Response): Promise<void> => {
  try {
    const modules = await Module.find().sort({ order: 1 });
    sendSuccess(res, "Modules fetched.", modules);
  } catch (error) {
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
