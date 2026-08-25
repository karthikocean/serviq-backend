import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import SuperAdminUser from "../../models/SuperAdminUser";
import SuperAdminRole from "../../models/SuperAdminRole";
import { sendSuccess, sendError } from "../../utils/response";
import { pagination } from "../../utils/pagination";
import { AuthRequest } from "../../middleware/authMiddleware";

// GET all managers
export const getAllManagers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Convert 1-based page to 0-based for internal calculation
    const pageIndex = Math.max(0, page - 1);
    const skip = pageIndex * limit;

    const total = await SuperAdminUser.countDocuments({ isDelete: false });

    const managers = await SuperAdminUser.find({ isDelete: false })
      .select("-password")
      .populate("role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    pagination(total, managers, limit, pageIndex, res, "Managers fetched successfully.");
  } catch (error) {
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// POST create manager
export const createManager = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phoneNumber, password, roleId, canLoginAdmin } = req.body;

    if (!name || !email || !phoneNumber || !password || !roleId) {
      sendError(res, "All fields are required.", StatusCodes.BAD_REQUEST);
      return;
    }

    const existing = await SuperAdminUser.findOne({ $or: [{ email }, { phoneNumber }], isDelete: false });
    if (existing) {
      sendError(res, "Email or phone already exists.", StatusCodes.CONFLICT);
      return;
    }

    const role = await SuperAdminRole.findById(roleId);
    if (!role) {
      sendError(res, "Role not found.", StatusCodes.NOT_FOUND);
      return;
    }

    const manager = await SuperAdminUser.create({
      name,
      email,
      phoneNumber,
      password,
      role: roleId,
      canLoginAdmin: canLoginAdmin ?? true,
      isActive: true,
      isDelete: false,
    });

    sendSuccess(res, "Manager created successfully.", { id: manager._id }, StatusCodes.CREATED);
  } catch (error) {
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// PUT update manager
export const updateManager = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, phoneNumber, roleId, canLoginAdmin, isActive, password } = req.body;

    const manager = await SuperAdminUser.findOne({ _id: id, isDelete: false });
    if (!manager) {
      sendError(res, "Manager not found.", StatusCodes.NOT_FOUND);
      return;
    }

    if (name) manager.name = name;
    if (email) manager.email = email;
    if (phoneNumber) manager.phoneNumber = phoneNumber;
    if (roleId) manager.role = roleId;
    if (canLoginAdmin !== undefined) manager.canLoginAdmin = canLoginAdmin;
    if (isActive !== undefined) manager.isActive = isActive;
    if (password) manager.password = password;

    await manager.save();
    sendSuccess(res, "Manager updated successfully.");
  } catch (error) {
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// DELETE soft delete manager
export const deleteManager = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const manager = await SuperAdminUser.findOne({ _id: id, isDelete: false });
    if (!manager) {
      sendError(res, "Manager not found.", StatusCodes.NOT_FOUND);
      return;
    }
    manager.isDelete = true;
    await manager.save();
    sendSuccess(res, "Manager deleted successfully.");
  } catch (error) {
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
