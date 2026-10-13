import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { pagination } from "../../utils/pagination";
import { AuthRequest } from "../../middleware/authMiddleware";
import {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  toggleMenuItemAvailability,
  deleteMenuItem,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from "../../services/admin/menu.service";
import { getTargetBranchId } from "../../utils/authUtils";

export const getItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    let branchId: string | undefined = undefined;

    if (req.query.branchId !== undefined && req.query.branchId !== null && String(req.query.branchId).trim() !== '') {
      const qBranch = String(req.query.branchId).trim();
      if (qBranch !== 'all' && qBranch !== 'ALL') {
        branchId = qBranch;
      }
    } else {
      // If no branchId was specified in query:
      // For RESTAURANT_OWNER and SUPER_ADMIN, undefined means All Branches (show all company + individual menus).
      // Only for branch-level staff (BRANCH_ADMIN / STAFF), restrict to their assigned activeBranchId.
      if (req.user?.userType === 'BRANCH_ADMIN' || req.user?.userType === 'STAFF') {
        branchId = req.user?.activeBranchId;
      }
    }

    const categoryFilter = req.query.category as string | undefined;
    const availableFilter = req.query.available as string | undefined;
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string | undefined;

    // Convert 1-based page to 0-based for internal calculation
    const pageIndex = Math.max(0, page);
    const skip = pageIndex * limit;

    const { total, items } = await getMenuItems(restaurantId, branchId, categoryFilter, availableFilter, skip, limit, search);
    pagination(total, items, limit, pageIndex, res, "Menu items fetched successfully.");
  } catch (error: any) {
    sendError(res, error?.message || "Failed to fetch menu items", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

import mongoose from "mongoose";
import Branch from "../../models/Branch";

export const createItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    let branchId = req.body?.branchId || getTargetBranchId(req);
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    let branchDoc: any = null;
    if (branchId && branchId !== 'ALL' && branchId !== 'all' && branchId !== 'COMPANY' && branchId !== 'company') {
      if (mongoose.Types.ObjectId.isValid(branchId)) {
        branchDoc = await Branch.findOne({ _id: branchId, restaurantId, isDelete: false });
      }
      if (!branchDoc) {
        branchDoc = await Branch.findOne({
          restaurantId,
          $or: [{ branchCode: branchId }, { branchName: branchId }],
          isDelete: false
        });
      }
      if (branchDoc) {
        branchId = branchDoc._id.toString();
      }
    }

    // Check if the target branch has useCustomMenu enabled
    const isCustomBranch = branchDoc && (branchDoc.useCustomMenu === true || String(branchDoc.useCustomMenu) === "true");

    // If branch has useCustomMenu, this item belongs exclusively to this custom branch
    // If not, it is part of the restaurant's Company Menu
    const isCompanyMenu = !isCustomBranch;

    if (!branchId) {
      let defaultBranch = await Branch.findOne({ restaurantId, isMainBranch: true, isDelete: false });
      if (!defaultBranch) {
        defaultBranch = await Branch.findOne({ restaurantId, isDelete: false }).sort({ createdAt: 1 });
      }
      if (defaultBranch) {
        branchId = defaultBranch._id.toString();
      }
    }

    if (!branchId) return sendError(res, "Branch not found for restaurant", StatusCodes.BAD_REQUEST);

    const newItem = await createMenuItem(restaurantId, branchId, {
      ...req.body,
      isCompanyMenu
    });
    sendSuccess(res, "Menu item created successfully.", { id: newItem._id });
  } catch (error: any) {
    sendError(res, error?.message || "Failed to create menu item", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const updateItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const itemId = req.params.itemId as string;
    await updateMenuItem(restaurantId, branchId, itemId, req.body);
    sendSuccess(res, "Item updated successfully.");
  } catch (error: any) {
    if (error.message === "Menu item not found") {
      sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else {
      sendError(res, "Failed to update menu item", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const toggleItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const itemId = req.params.itemId as string;
    const { available } = req.body;
    await toggleMenuItemAvailability(restaurantId, branchId, itemId, available);
    sendSuccess(res, "Item availability toggled.");
  } catch (error: any) {
    if (error.message === "Menu item not found") {
      sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else {
      sendError(res, "Failed to toggle item availability", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const deleteItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const itemId = req.params.itemId as string;
    await deleteMenuItem(restaurantId, branchId, itemId);
    sendSuccess(res, "Item deleted successfully.");
  } catch (error: any) {
    if (error.message === "Menu item not found") {
      sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else {
      sendError(res, "Failed to delete menu item", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const getCats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    let branchId = getTargetBranchId(req);
    if (req.query.branchId === 'all') {
      branchId = undefined;
    }
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);
    const page = parseInt(req.query.page as string);
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string | undefined;

    if (!isNaN(page)) {
      // Pagination flow
      const pageIndex = Math.max(0, page);
      const skip = pageIndex * limit;
      const { total, items } = await getCategories(restaurantId, branchId, skip, limit, search);
      pagination(total, items, limit, pageIndex, res, "Categories fetched.");
    } else {
      const { items } = await getCategories(restaurantId, branchId, 0, 0, search);
      sendSuccess(res, "Categories fetched.", items);
    }
  } catch (error: any) {
    sendError(res, error?.message || "Failed to fetch categories", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const createCategoryController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const catData = req.body;
    const newCategory = await createCategory(restaurantId, branchId, catData);
    sendSuccess(res, "Category created.", newCategory);
  } catch (error: any) {
    sendError(res, error?.message || "Failed to create category", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const updateCategoryController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const categoryId = req.params.id as string;
    const cat = await updateCategory(restaurantId, branchId, categoryId, req.body);
    sendSuccess(res, "Category updated.", cat);
  } catch (error: any) {
    if (error.message === "Category not found") {
      sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else {
      sendError(res, "Failed to update category", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

export const deleteCategoryController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const categoryId = req.params.id as string;
    await deleteCategory(restaurantId, branchId, categoryId);
    sendSuccess(res, "Category deleted successfully.");
  } catch (error: any) {
    if (error.message === "Category not found") {
      sendError(res, error.message, StatusCodes.NOT_FOUND);
    } else {
      sendError(res, "Failed to delete category", StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};
