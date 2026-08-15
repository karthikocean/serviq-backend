import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/authMiddleware";
import {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  toggleMenuItemAvailability,
  deleteMenuItem,
  getCategories,
  addCategories
} from "../../services/admin/menu.service";
import { getTargetBranchId } from "../../utils/authUtils";

export const getItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const categoryFilter = req.query.category as string | undefined;
    const availableFilter = req.query.available as string | undefined;

    const items = await getMenuItems(restaurantId, branchId, categoryFilter, availableFilter);
    sendSuccess(res, "Menu items fetched successfully.", items);
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
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const categories = await getCategories(restaurantId, branchId);
    sendSuccess(res, "Categories fetched.", categories);
  } catch (error) {
    sendError(res, "Failed to fetch categories", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const createCats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);

    const { categories } = req.body;
    const updatedCategories = await addCategories(restaurantId, branchId, categories);
    sendSuccess(res, "Categories updated.", { categories: updatedCategories });
  } catch (error) {
    sendError(res, "Failed to save categories", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
