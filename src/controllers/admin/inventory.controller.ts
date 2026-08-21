import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AuthRequest } from "../../middleware/authMiddleware";
import { sendSuccess, sendError } from "../../utils/response";
import InventoryCategory from "../../models/InventoryCategory";
import InventoryItem from "../../models/InventoryItem";
import InventoryPurchase from "../../models/InventoryPurchase";
import InventoryReduction from "../../models/InventoryReduction";
import { pagination } from "../../utils/pagination";
import { getTargetBranchId } from "../../utils/authUtils";
import mongoose from "mongoose";

// --- CATEGORIES ---

export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);

    const { name, description, status } = req.body;

    const newCategory = await InventoryCategory.create({
      restaurantId,
      branchId,
      name,
      description,
      status
    });

    sendSuccess(res, "Category created successfully", newCategory, StatusCodes.CREATED);
  } catch (error) {
    console.error("Create Inventory Category Error:", error);
    sendError(res, "Failed to create category", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);

    const query: any = { restaurantId, isDelete: false };
    if (branchId) query.branchId = branchId;

    const categories = await InventoryCategory.find(query);
    sendSuccess(res, "Categories fetched successfully", categories);
  } catch (error) {
    console.error("Get Inventory Categories Error:", error);
    sendError(res, "Failed to fetch categories", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// --- ITEMS ---

export const createItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);

    const { categoryId, name, sku, currentStock, minAlertLevel, unit, costPerUnit, supplierName, supplierPhone, status } = req.body;

    const newItem = await InventoryItem.create({
      restaurantId,
      branchId,
      categoryId,
      name,
      sku,
      currentStock,
      minAlertLevel,
      unit,
      costPerUnit,
      supplierName,
      supplierPhone,
      status: status || "available"
    });

    const populatedItem = await InventoryItem.findById(newItem._id).populate("categoryId", "name");

    sendSuccess(res, "Inventory item created successfully", populatedItem, StatusCodes.CREATED);
  } catch (error) {
    console.error("Create Inventory Item Error:", error);
    sendError(res, "Failed to create item", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);

    const { page = 0, limit = 10, search } = req.query;

    const query: any = {
      restaurantId,
      isDelete: false
    };
    if (branchId) query.branchId = branchId;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } }
      ];
    }

    const totalCount = await InventoryItem.countDocuments(query);
    const items = await InventoryItem.find(query)
      .populate("categoryId", "name")
      .skip(Number(page) * Number(limit))
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    pagination(totalCount, items, Number(limit), Number(page), res, "Inventory items fetched");
  } catch (error) {
    console.error("Get Inventory Items Error:", error);
    sendError(res, "Failed to fetch items", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// --- PURCHASE & RESTOCK ---

export const recordPurchase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    const userId = req.user?.userId;

    const { itemId, supplierName, supplierPhone, purchaseQty, unitPrice, invoiceNumber, purchaseDate } = req.body;

    const item = await InventoryItem.findOne({ _id: itemId, branchId, isDelete: false });
    if (!item) {
      return sendError(res, "Inventory item not found", StatusCodes.NOT_FOUND);
    }

    const totalAmount = purchaseQty * unitPrice;

    const purchase = await InventoryPurchase.create({
      restaurantId,
      branchId,
      itemId,
      supplierName,
      supplierPhone,
      purchaseQty,
      unitPrice,
      totalAmount,
      invoiceNumber,
      purchaseDate,
      addedBy: userId
    });

    item.currentStock += purchaseQty;
    item.costPerUnit = unitPrice; 
    if (item.currentStock > item.minAlertLevel && item.status === "OUT_OF_STOCK" || item.status === "LOW_STOCK") {
        item.status = "AVAILABLE";
    }
    
    await item.save();

    sendSuccess(res, "Purchase recorded successfully", purchase, StatusCodes.CREATED);
  } catch (error) {
    console.error("Record Purchase Error:", error);
    sendError(res, "Failed to record purchase", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// --- REDUCTION & WASTAGE ---

export const recordReduction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    const userId = req.user?.userId;

    const { itemId, quantityToReduce, reason, details } = req.body;

    const item = await InventoryItem.findOne({ _id: itemId, branchId, isDelete: false });
    if (!item) {
      return sendError(res, "Inventory item not found", StatusCodes.NOT_FOUND);
    }

    if (item.currentStock < quantityToReduce) {
      return sendError(res, "Insufficient stock to reduce", StatusCodes.BAD_REQUEST);
    }

    const value = quantityToReduce * item.costPerUnit;

    const reduction = await InventoryReduction.create({
      restaurantId,
      branchId,
      itemId,
      quantityToReduce,
      reason,
      details,
      value,
      reducedBy: userId
    });

    item.currentStock -= quantityToReduce;
    if (item.currentStock === 0) {
        item.status = "OUT_OF_STOCK";
    } else if (item.currentStock <= item.minAlertLevel) {
        item.status = "LOW_STOCK";
    }
    await item.save();

    sendSuccess(res, "Stock reduced successfully", reduction, StatusCodes.CREATED);
  } catch (error) {
    console.error("Record Reduction Error:", error);
    sendError(res, "Failed to record stock reduction", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// --- DASHBOARD LOGS & STATS ---

export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const restaurantId = req.user?.restaurantId;
        const branchId = getTargetBranchId(req);

        if (!restaurantId || !branchId) return sendError(res, "Unauthorized", StatusCodes.UNAUTHORIZED);
        
        const [purchases, reductions, items] = await Promise.all([
            InventoryPurchase.aggregate([
                { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId), branchId: new mongoose.Types.ObjectId(branchId), isDelete: false } },
                { $group: { _id: null, totalAmount: { $sum: "$totalAmount" }, count: { $sum: 1 } } }
            ]),
            InventoryReduction.aggregate([
                { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId), branchId: new mongoose.Types.ObjectId(branchId), isDelete: false } },
                { $group: { _id: null, totalValue: { $sum: "$value" }, count: { $sum: 1 } } }
            ]),
            InventoryItem.countDocuments({
                restaurantId: new mongoose.Types.ObjectId(restaurantId), 
                branchId: new mongoose.Types.ObjectId(branchId), 
                isDelete: false,
                currentStock: { $gt: 0 } // Active means stock > 0 as per UI or just general count
            })
        ]);

        const stats = {
            totalReductionsCount: reductions[0]?.count || 0,
            totalReductionsValue: reductions[0]?.totalValue || 0,
            totalPurchasesValue: purchases[0]?.totalAmount || 0,
            totalPurchasesCount: purchases[0]?.count || 0,
            activeItemsCount: items
        };

        sendSuccess(res, "Inventory stats fetched successfully", stats);
    } catch (error) {
        console.error("Get Inventory Stats Error:", error);
        sendError(res, "Failed to fetch inventory stats", StatusCodes.INTERNAL_SERVER_ERROR);
    }
}

export const updateCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const branchId = getTargetBranchId(req);
    const { id } = req.params;
    const { name, description, status } = req.body;

    const category = await InventoryCategory.findOneAndUpdate(
      { _id: id, branchId, isDelete: false },
      { name, description, status },
      { new: true }
    );

    if (!category) return sendError(res, "Category not found", StatusCodes.NOT_FOUND);

    sendSuccess(res, "Category updated", category);
  } catch (error) {
    console.error("Update Inventory Category Error:", error);
    sendError(res, "Failed to update category", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const branchId = getTargetBranchId(req);
    const { id } = req.params;

    const category = await InventoryCategory.findOneAndUpdate(
      { _id: id, branchId, isDelete: false },
      { isDelete: true },
      { new: true }
    );

    if (!category) return sendError(res, "Category not found", StatusCodes.NOT_FOUND);

    sendSuccess(res, "Category deleted successfully");
  } catch (error) {
    console.error("Delete Inventory Category Error:", error);
    sendError(res, "Failed to delete category", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const updateItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const branchId = getTargetBranchId(req);
    const { id } = req.params;
    const { categoryId, name, sku, currentStock, minAlertLevel, unit, costPerUnit, supplierName, supplierPhone, status } = req.body;

    const item = await InventoryItem.findOneAndUpdate(
      { _id: id, branchId, isDelete: false },
      { categoryId, name, sku, currentStock, minAlertLevel, unit, costPerUnit, supplierName, supplierPhone, status: status || "available" },
      { new: true }
    ).populate("categoryId", "name");

    if (!item) return sendError(res, "Item not found", StatusCodes.NOT_FOUND);

    sendSuccess(res, "Item updated", item);
  } catch (error) {
    console.error("Update Inventory Item Error:", error);
    sendError(res, "Failed to update item", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const deleteItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const branchId = getTargetBranchId(req);
    const { id } = req.params;

    const item = await InventoryItem.findOneAndUpdate(
      { _id: id, branchId, isDelete: false },
      { isDelete: true },
      { new: true }
    );

    if (!item) return sendError(res, "Item not found", StatusCodes.NOT_FOUND);

    sendSuccess(res, "Item deleted successfully");
  } catch (error) {
    console.error("Delete Inventory Item Error:", error);
    sendError(res, "Failed to delete item", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    const { page = 0, limit = 10, type = "all" } = req.query;
    
    // type can be "purchase" or "reduction"
    let data: any[] = [];
    let totalCount = 0;

    const query: any = { restaurantId, isDelete: false };
    if (branchId) query.branchId = branchId;

    if (type === "purchase") {
       totalCount = await InventoryPurchase.countDocuments(query);
       data = await InventoryPurchase.find(query)
          .populate("itemId", "name sku categoryId")
          .populate("addedBy", "name")
          .skip(Number(page) * Number(limit))
          .limit(Number(limit))
          .sort({ createdAt: -1 });
    } else if (type === "reduction") {
       totalCount = await InventoryReduction.countDocuments(query);
       data = await InventoryReduction.find(query)
          .populate("itemId", "name sku categoryId")
          .populate("reducedBy", "name")
          .skip(Number(page) * Number(limit))
          .limit(Number(limit))
          .sort({ createdAt: -1 });
    } else {
       // all logs combined (simplified for now, ideally separate endpoints or aggressive aggregation)
       // Returning just empty array or we can fetch both and sort, but for simplicity:
       return sendError(res, "Please specify type=purchase or type=reduction", StatusCodes.BAD_REQUEST);
    }

    pagination(totalCount, data, Number(limit), Number(page), res, "Logs fetched");
  } catch (error) {
    console.error("Get Inventory Logs Error:", error);
    sendError(res, "Failed to fetch logs", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
