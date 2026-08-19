import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import Category from "../../../models/Category";
import Menu from "../../../models/Menu";
import { AuthRequest } from "../../../middleware/authMiddleware";
import { sendSuccess, sendError } from "../../../utils/response";
import { pagination } from "../../../utils/pagination";

export const getCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId, activeBranchId } = req.user!;
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = page * limit;

    const query: any = {
      restaurantId,
      branchId: activeBranchId,
      status: "AVAILABLE"
    };

    const totalCount = await Category.countDocuments(query);
    const categories = await Category.find(query)
      .select("name description status")
      .skip(skip)
      .limit(limit);

    pagination(totalCount, categories, limit, page, res, "Categories fetched successfully");
  } catch (error) {
    console.error("Waiter Menu Categories Error:", error);
    sendError(res, "Failed to fetch categories", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId, activeBranchId } = req.user!;
    const { categoryId } = req.query;

    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = page * limit;

    const query: any = {
      restaurantId,
      branchId: activeBranchId,
      isActive: true,
      isDelete: false,
      available: true
    };

    if (categoryId) {
      query.category = categoryId;
    }

    const totalCount = await Menu.countDocuments(query);
    const items = await Menu.find(query)
      .populate("category", "name")
      .select("name desc price image veg bestseller available")
      .skip(skip)
      .limit(limit);

    pagination(totalCount, items, limit, page, res, "Menu items fetched successfully");
  } catch (error) {
    console.error("Waiter Menu Items Error:", error);
    sendError(res, "Failed to fetch menu items", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
