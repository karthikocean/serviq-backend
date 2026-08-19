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
    let branchId = getTargetBranchId(req);
    if (req.query.branchId === 'all') {
      branchId = undefined;
    }
    if (!restaurantId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const categoryFilter = req.query.category as string | undefined;
    const availableFilter = req.query.available as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string | undefined;

    const pageIndex = Math.max(0, page - 1);
    const skip = pageIndex * limit;

    const { total, items } = await getMenuItems(restaurantId, branchId, categoryFilter, availableFilter, skip, limit, search);
    pagination(total, items, limit, pageIndex, res, "Menu items fetched successfully.");
  } catch (error) {
    sendError(res, "Failed to fetch menu items", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const createItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const newItem = await createMenuItem(restaurantId, branchId, req.body);
    sendSuccess(res, "Menu item created successfully.", { id: newItem._id });
  } catch (error) {
    sendError(res, "Failed to create menu item", StatusCodes.INTERNAL_SERVER_ERROR);
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
    const limit = parseInt(req.query.limit as string);
    const search = req.query.search as string | undefined;

    if (page && limit) {
      const pageIndex = Math.max(0, page - 1);
      const skip = pageIndex * limit;
      const { total, items } = await getCategories(restaurantId, branchId, skip, limit, search);
      pagination(total, items, limit, pageIndex, res, "Categories fetched.");
    } else {
      const { items } = await getCategories(restaurantId, branchId, 0, 0, search);
      sendSuccess(res, "Categories fetched.", items);
    }
  } catch (error) {
    sendError(res, "Failed to fetch categories", StatusCodes.INTERNAL_SERVER_ERROR);
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
  } catch (error) {
    sendError(res, "Failed to create category", StatusCodes.INTERNAL_SERVER_ERROR);
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
