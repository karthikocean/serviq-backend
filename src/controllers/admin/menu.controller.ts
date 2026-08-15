import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { pagination } from "../../utils/pagination";
import { AuthRequest } from "../../middleware/authMiddleware";
import Menu from "../../models/Menu";

export const createMenuItem = async (req: AuthRequest, res: Response): Promise<void> => {
    const { name, desc, price, category, image, available, veg, bestseller } = req.body;
    if (!name || price === undefined || !category) {
        sendError(res, "Name, price, and category are required.", StatusCodes.BAD_REQUEST);
        return;
    }
    try {
        const { restaurantId, activeBranchId } = req.user as any;
        if (!activeBranchId) {
            sendError(res, "Please select an active branch to create a menu item.", StatusCodes.BAD_REQUEST);
            return;
        }
        const exist = await Menu.findOne({ name, category, restaurantId, branchId: activeBranchId, isDelete: false });
        if (exist) {
            sendError(res, "Menu item with this name already exists in this category.", StatusCodes.CONFLICT);
            return;
        }
        const menuItem = await Menu.create({
            restaurantId,
            branchId: activeBranchId,
            name,
            desc: desc || "",
            price: Number(price),
            category,
            image: image || "",
            available: available !== undefined ? available : true,
            veg: veg !== undefined ? veg : true,
            bestseller: bestseller !== undefined ? bestseller : false,
            isDelete: false
        });
        sendSuccess(res, "Menu item created successfully.", menuItem, StatusCodes.CREATED);
    } catch (err) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const getMenuItems = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { restaurantId, activeBranchId } = req.user as any;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const pageIndex = Math.max(0, page - 1);
        const skip = pageIndex * limit;

        const total = await Menu.countDocuments({ restaurantId, branchId: activeBranchId, isDelete: false });

        const menuItems = await Menu.find({ restaurantId, branchId: activeBranchId, isDelete: false })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
            
        pagination(total, menuItems, limit, pageIndex, res, "Menu items fetched successfully.");
    } catch (err) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const getMenuItem = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    if (!id) {
        sendError(res, "Menu item ID is required.", StatusCodes.BAD_REQUEST);
        return;
    }
    try {
        const { restaurantId, activeBranchId } = req.user as any;
        const menuItem = await Menu.findOne({ _id: id, restaurantId, branchId: activeBranchId, isDelete: false });
        if (!menuItem) {
            sendError(res, "Menu item not found.", StatusCodes.NOT_FOUND);
            return;
        }
        sendSuccess(res, "Menu item fetched successfully.", menuItem);
    } catch (err) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const updateMenuItem = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { name, desc, price, category, image, available, veg, bestseller } = req.body;
    if (!id) {
        sendError(res, "Menu item ID is required.", StatusCodes.BAD_REQUEST);
        return;
    }
    try {
        const { restaurantId, activeBranchId } = req.user as any;
        const menuItem = await Menu.findOne({ _id: id, restaurantId, branchId: activeBranchId, isDelete: false });
        if (!menuItem) {
            sendError(res, "Menu item not found.", StatusCodes.NOT_FOUND);
            return;
        }

        if (name !== undefined) {
            const exist = await Menu.findOne({ name, category: category || menuItem.category, _id: { $ne: id }, restaurantId, branchId: activeBranchId, isDelete: false });
            if (exist) {
                sendError(res, "Menu item with this name already exists in this category.", StatusCodes.CONFLICT);
                return;
            }
            menuItem.name = name;
        }

        if (desc !== undefined) menuItem.desc = desc;
        if (price !== undefined) menuItem.price = Number(price);
        if (category !== undefined) menuItem.category = category;
        if (image !== undefined) menuItem.image = image;
        if (available !== undefined) menuItem.available = available;
        if (veg !== undefined) menuItem.veg = veg;
        if (bestseller !== undefined) menuItem.bestseller = bestseller;

        await menuItem.save();
        sendSuccess(res, "Menu item updated successfully.", menuItem);
    } catch (err) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const deleteMenuItem = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    if (!id) {
        sendError(res, "Menu item ID is required.", StatusCodes.BAD_REQUEST);
        return;
    }
    try {
        const { restaurantId, activeBranchId } = req.user as any;
        const menuItem = await Menu.findOne({ _id: id, restaurantId, branchId: activeBranchId, isDelete: false });
        if (!menuItem) {
            sendError(res, "Menu item not found.", StatusCodes.NOT_FOUND);
            return;
        }
        menuItem.isDelete = true;
        await menuItem.save();
        sendSuccess(res, "Menu item deleted successfully.", menuItem);
    } catch (err) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};
