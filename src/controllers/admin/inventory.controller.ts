import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AuthRequest } from "../../middleware/authMiddleware";
import { sendSuccess, sendError } from "../../utils/response";
import InventoryCategory from "../../models/InventoryCategory";
import InventoryItem from "../../models/InventoryItem";
import InventoryPurchase from "../../models/InventoryPurchase";
import InventoryReduction from "../../models/InventoryReduction";
import InventoryRequest from "../../models/InventoryRequest";
import Vendor from "../../models/Vendor";
import Notification from "../../models/Notification";
import Branch from "../../models/Branch";
import { pagination } from "../../utils/pagination";
import { getTargetBranchId } from "../../utils/authUtils";
import mongoose from "mongoose";

// --- VENDORS ---

export const createVendor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);

    const { name, companyName, phone, status } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return sendError(res, "Vendor / Contact Name is required", StatusCodes.BAD_REQUEST);
    }

    // Auto generate vendorCode in VEN-001 format
    const count = await Vendor.countDocuments({ restaurantId });
    let nextNum = count + 1;
    let generatedCode = `VEN-${String(nextNum).padStart(3, "0")}`;
    while (await Vendor.exists({ restaurantId, vendorCode: generatedCode })) {
      nextNum++;
      generatedCode = `VEN-${String(nextNum).padStart(3, "0")}`;
    }

    const vendorStatus = status === "INACTIVE" ? "INACTIVE" : "ACTIVE";

    const newVendor = await Vendor.create({
      restaurantId,
      branchId: branchId && branchId !== "ALL" ? branchId : undefined,
      vendorCode: generatedCode,
      name: name.trim(),
      companyName: companyName ? companyName.trim() : "",
      phone: phone ? phone.trim() : "",
      status: vendorStatus
    });

    sendSuccess(res, "Vendor created successfully", newVendor, StatusCodes.CREATED);
  } catch (error: any) {
    console.error("Create Vendor Error:", error);
    sendError(res, error?.message || "Failed to create vendor", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getVendors = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);

    const query: any = { restaurantId, isDelete: false };
    if (branchId && branchId !== "ALL") query.branchId = branchId;

    const vendors = await Vendor.find(query).sort({ createdAt: -1 });
    sendSuccess(res, "Vendors fetched successfully", vendors);
  } catch (error: any) {
    console.error("Get Vendors Error:", error);
    sendError(res, error?.message || "Failed to fetch vendors", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const updateVendor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const { id } = req.params;
    const { name, companyName, phone, status } = req.body;

    const updateFields: any = {};
    if (name) updateFields.name = name.trim();
    if (companyName !== undefined) updateFields.companyName = companyName.trim();
    if (phone !== undefined) updateFields.phone = phone.trim();
    if (status !== undefined) updateFields.status = status === "INACTIVE" ? "INACTIVE" : "ACTIVE";

    const vendor = await Vendor.findOneAndUpdate(
      { _id: id, restaurantId, isDelete: false },
      updateFields,
      { new: true }
    );

    if (!vendor) return sendError(res, "Vendor not found", StatusCodes.NOT_FOUND);

    sendSuccess(res, "Vendor updated successfully", vendor);
  } catch (error: any) {
    console.error("Update Vendor Error:", error);
    sendError(res, error?.message || "Failed to update vendor", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const deleteVendor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const { id } = req.params;

    const vendor = await Vendor.findOneAndUpdate(
      { _id: id, restaurantId, isDelete: false },
      { isDelete: true },
      { new: true }
    );

    if (!vendor) return sendError(res, "Vendor not found", StatusCodes.NOT_FOUND);

    sendSuccess(res, "Vendor deleted successfully");
  } catch (error: any) {
    console.error("Delete Vendor Error:", error);
    sendError(res, error?.message || "Failed to delete vendor", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};


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
  } catch (error: any) {
    console.error("Create Inventory Category Error:", error);
    sendError(res, error?.message || "Failed to create category", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);

    const query: any = { restaurantId, isDelete: false };
    if (branchId && branchId !== "ALL") query.branchId = branchId;

    const categories = await InventoryCategory.find(query);
    sendSuccess(res, "Categories fetched successfully", categories);
  } catch (error: any) {
    console.error("Get Inventory Categories Error:", error);
    sendError(res, error?.message || "Failed to fetch categories", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// --- ITEMS ---

export const createItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);

    const { categoryId, category, name, minAlertLevel, minStock, unit, isActive } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return sendError(res, "Item Name is required", StatusCodes.BAD_REQUEST);
    }

    if (/\d/.test(name)) {
      return sendError(res, "Item Name cannot contain numbers", StatusCodes.BAD_REQUEST);
    }

    const minLevel = minAlertLevel !== undefined ? Number(minAlertLevel) : (minStock !== undefined ? Number(minStock) : 0);
    const itemIsActive = isActive !== undefined ? (isActive === true || isActive === "true") : true;

    // Auto generate itemCode in INV-001 format
    const count = await InventoryItem.countDocuments({ restaurantId });
    let nextNum = count + 1;
    let generatedCode = `INV-${String(nextNum).padStart(3, "0")}`;
    while (await InventoryItem.exists({ restaurantId, itemCode: generatedCode })) {
      nextNum++;
      generatedCode = `INV-${String(nextNum).padStart(3, "0")}`;
    }

    const newItem = await InventoryItem.create({
      restaurantId,
      branchId: branchId && branchId !== "ALL" ? branchId : undefined,
      categoryId: categoryId || undefined,
      category: category || "",
      itemCode: generatedCode,
      name: name.trim(),
      minAlertLevel: minLevel,
      unit: unit || "kg",
      isActive: itemIsActive
    });

    const populatedItem = await InventoryItem.findById((newItem as any)._id).populate("categoryId", "name");

    sendSuccess(res, "Inventory item created successfully", populatedItem, StatusCodes.CREATED);
  } catch (error: any) {
    console.error("Create Inventory Item Error:", error);
    sendError(res, error?.message || "Failed to create item", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);

    const { page = 0, limit = 10, search, category, isActive } = req.query;

    const query: any = {
      restaurantId,
      isDelete: false
    };

    if (branchId && branchId !== "ALL") {
      query.$or = [
        { branchId: branchId },
        { branchId: { $exists: false } },
        { branchId: null }
      ];
    }

    if (category && category !== "All" && category !== "ALL") {
      query.$or = [
        { category: category },
        { categoryId: category }
      ];
    }

    if (isActive !== undefined && isActive !== "All" && isActive !== "ALL") {
      query.isActive = String(isActive) === "true";
    }

    if (search) {
      const searchRegex = { $regex: String(search), $options: "i" };
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: [{ name: searchRegex }, { itemCode: searchRegex }, { category: searchRegex }] }
        ];
        delete query.$or;
      } else {
        query.$or = [
          { name: searchRegex },
          { itemCode: searchRegex },
          { category: searchRegex }
        ];
      }
    }

    const totalCount = await InventoryItem.countDocuments(query);
    const items = await InventoryItem.find(query)
      .populate("categoryId", "name")
      .skip(Number(page) * Number(limit))
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    pagination(totalCount, items, Number(limit), Number(page), res, "Inventory items fetched");
  } catch (error: any) {
    console.error("Get Inventory Items Error:", error);
    sendError(res, error?.message || "Failed to fetch items", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// --- PURCHASE & RESTOCK ---

export const recordPurchase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);
    const userId = req.user?.userId;

    const {
      purchaseType,
      supplier,
      supplierName,
      supplierPhone,
      vendorId,
      itemId,
      item: itemNameInput,
      invoiceNo,
      invoiceNumber,
      purchaseDate,
      unit,
      quantity,
      purchaseQty,
      rate,
      unitPrice,
      remarks
    } = req.body;

    const finalSupplier = supplier || supplierName || "";
    const finalInvoice = invoiceNo || invoiceNumber || "";
    const finalQty = Number(quantity || purchaseQty || 0);
    const finalRate = Number(rate || unitPrice || 0);
    const finalType = purchaseType || "Material Purchase";
    const finalUnit = unit || "kg";
    const finalRemarks = remarks || "";
    const pDate = purchaseDate ? new Date(purchaseDate) : new Date();

    if (!finalSupplier) {
      return sendError(res, "Vendor / Supplier Name is required", StatusCodes.BAD_REQUEST);
    }
    if (finalQty <= 0) {
      return sendError(res, "Valid Purchase Quantity is required", StatusCodes.BAD_REQUEST);
    }

    // Auto generate purchaseNo in PU-001 format
    const count = await InventoryPurchase.countDocuments({ restaurantId });
    let nextNum = count + 1;
    let generatedCode = `PU-${String(nextNum).padStart(3, "0")}`;
    while (await InventoryPurchase.exists({ restaurantId, purchaseNo: generatedCode })) {
      nextNum++;
      generatedCode = `PU-${String(nextNum).padStart(3, "0")}`;
    }

    // Find item matching current branch or company scope
    let matchedItem: any = null;
    const itemQuery: any = { restaurantId, isDelete: false };
    if (branchId && branchId !== "ALL") {
      itemQuery.branchId = branchId;
    }

    if (itemId && mongoose.Types.ObjectId.isValid(itemId)) {
      matchedItem = await InventoryItem.findOne({ _id: itemId, restaurantId, isDelete: false });
    } else if (itemNameInput) {
      matchedItem = await InventoryItem.findOne({ name: itemNameInput, ...itemQuery });
      if (!matchedItem) {
        matchedItem = await InventoryItem.findOne({ name: itemNameInput, restaurantId, isDelete: false });
      }
    }

    const totalAmount = finalQty * finalRate;

    const purchase = await InventoryPurchase.create({
      restaurantId,
      branchId: branchId && branchId !== "ALL" ? branchId : undefined,
      purchaseNo: generatedCode,
      purchaseType: finalType,
      vendorId: vendorId && mongoose.Types.ObjectId.isValid(vendorId) ? vendorId : undefined,
      supplierName: finalSupplier,
      supplierPhone: supplierPhone || "",
      itemId: matchedItem ? matchedItem._id : (itemId && mongoose.Types.ObjectId.isValid(itemId) ? itemId : undefined),
      itemName: matchedItem ? matchedItem.name : (itemNameInput || ""),
      purchaseQty: finalQty,
      unitPrice: finalRate,
      unit: matchedItem ? matchedItem.unit : finalUnit,
      totalAmount,
      invoiceNumber: finalInvoice,
      purchaseDate: pDate,
      remarks: finalRemarks,
      addedBy: userId
    });

    if (matchedItem) {
      const stock = matchedItem.currentStock || 0;
      matchedItem.currentStock = stock + finalQty;
      matchedItem.costPerUnit = finalRate;
      if ((matchedItem.currentStock || 0) > matchedItem.minAlertLevel && ((matchedItem as any).status === "OUT_OF_STOCK" || (matchedItem as any).status === "LOW_STOCK")) {
        (matchedItem as any).status = "AVAILABLE";
      }
      await matchedItem.save();
    }

    sendSuccess(res, "Purchase recorded successfully", purchase, StatusCodes.CREATED);
  } catch (error: any) {
    console.error("Record Purchase Error:", error);
    sendError(res, error?.message || "Failed to record purchase", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getPurchases = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);

    const query: any = { restaurantId, isDelete: false };
    if (branchId && branchId !== "ALL") query.branchId = branchId;

    const purchases = await InventoryPurchase.find(query)
      .populate("itemId", "name unit")
      .populate("vendorId", "name vendorCode companyName phone")
      .sort({ createdAt: -1 });

    sendSuccess(res, "Purchases fetched successfully", purchases);
  } catch (error: any) {
    console.error("Get Purchases Error:", error);
    sendError(res, error?.message || "Failed to fetch purchases", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const deletePurchase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const { id } = req.params;

    const purchase = await InventoryPurchase.findOneAndUpdate(
      { _id: id, restaurantId, isDelete: false },
      { isDelete: true },
      { new: true }
    );

    if (!purchase) return sendError(res, "Purchase record not found", StatusCodes.NOT_FOUND);

    sendSuccess(res, "Purchase deleted successfully");
  } catch (error: any) {
    console.error("Delete Purchase Error:", error);
    sendError(res, error?.message || "Failed to delete purchase", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
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

    const currentStockVal = item.currentStock || 0;

    if (currentStockVal < quantityToReduce) {
      return sendError(res, "Insufficient stock to reduce", StatusCodes.BAD_REQUEST);
    }

    const costPerUnitVal = item.costPerUnit || 0;
    const value = quantityToReduce * costPerUnitVal;

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

    item.currentStock = currentStockVal - quantityToReduce;
    if (item.currentStock === 0) {
        (item as any).status = "OUT_OF_STOCK";
    } else if (item.currentStock <= item.minAlertLevel) {
        (item as any).status = "LOW_STOCK";
    }
    await item.save();

    sendSuccess(res, "Stock reduced successfully", reduction, StatusCodes.CREATED);
  } catch (error: any) {
    console.error("Record Reduction Error:", error);
    sendError(res, error?.message || "Failed to record stock reduction", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
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
    } catch (error: any) {
        console.error("Get Inventory Stats Error:", error);
        sendError(res, error?.message || "Failed to fetch inventory stats", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
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
  } catch (error: any) {
    console.error("Update Inventory Category Error:", error);
    sendError(res, error?.message || "Failed to update category", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
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
  } catch (error: any) {
    console.error("Delete Inventory Category Error:", error);
    sendError(res, error?.message || "Failed to delete category", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const updateItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const { id } = req.params;
    const { categoryId, category, name, minAlertLevel, minStock, unit, isActive } = req.body;

    if (name && /\d/.test(name)) {
      return sendError(res, "Item Name cannot contain numbers", StatusCodes.BAD_REQUEST);
    }

    const updateFields: any = {};
    if (name) updateFields.name = name.trim();
    if (category !== undefined) updateFields.category = category;
    if (categoryId !== undefined) updateFields.categoryId = categoryId || null;
    if (minAlertLevel !== undefined) updateFields.minAlertLevel = Number(minAlertLevel);
    else if (minStock !== undefined) updateFields.minAlertLevel = Number(minStock);
    if (unit !== undefined) updateFields.unit = unit;
    if (isActive !== undefined) updateFields.isActive = (isActive === true || isActive === "true");

    const item = await InventoryItem.findOneAndUpdate(
      { _id: id, restaurantId, isDelete: false },
      updateFields,
      { new: true }
    ).populate("categoryId", "name");

    if (!item) return sendError(res, "Item not found", StatusCodes.NOT_FOUND);

    sendSuccess(res, "Item updated successfully", item);
  } catch (error: any) {
    console.error("Update Inventory Item Error:", error);
    sendError(res, error?.message || "Failed to update item", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const deleteItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const { id } = req.params;

    const item = await InventoryItem.findOneAndUpdate(
      { _id: id, restaurantId, isDelete: false },
      { isDelete: true },
      { new: true }
    );

    if (!item) return sendError(res, "Item not found", StatusCodes.NOT_FOUND);

    sendSuccess(res, "Item deleted successfully");
  } catch (error: any) {
    console.error("Delete Inventory Item Error:", error);
    sendError(res, error?.message || "Failed to delete item", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
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
    if (branchId && branchId !== "ALL") query.branchId = branchId;

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
  } catch (error: any) {
    console.error("Get Inventory Logs Error:", error);
    sendError(res, error?.message || "Failed to fetch logs", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// --- STOCK REQUESTS & DISTRIBUTIONS ---

export const createStockRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);

    const { itemId, item: itemName, reqQty, unit, remarks } = req.body;

    const finalItemName = itemName || "";
    const finalQty = Number(reqQty || 0);

    if (!finalItemName) {
      return sendError(res, "Item name is required for stock request", StatusCodes.BAD_REQUEST);
    }
    if (finalQty <= 0) {
      return sendError(res, "Valid requested quantity is required", StatusCodes.BAD_REQUEST);
    }

    // Auto generate requestNo in BR-REQ-001 format
    const count = await InventoryRequest.countDocuments({ restaurantId });
    let nextNum = count + 1;
    let generatedCode = `BR-REQ-${String(nextNum).padStart(3, "0")}`;
    while (await InventoryRequest.exists({ restaurantId, requestNo: generatedCode })) {
      nextNum++;
      generatedCode = `BR-REQ-${String(nextNum).padStart(3, "0")}`;
    }

    let matchedItem: any = null;
    if (itemId && mongoose.Types.ObjectId.isValid(itemId)) {
      matchedItem = await InventoryItem.findOne({ _id: itemId, restaurantId, isDelete: false });
    } else if (finalItemName) {
      matchedItem = await InventoryItem.findOne({ name: finalItemName, restaurantId, isDelete: false });
    }

    const stockReq = await InventoryRequest.create({
      restaurantId,
      branchId: branchId && branchId !== "ALL" ? branchId : undefined,
      requestNo: generatedCode,
      itemId: matchedItem ? matchedItem._id : (itemId && mongoose.Types.ObjectId.isValid(itemId) ? itemId : undefined),
      itemName: matchedItem ? matchedItem.name : finalItemName,
      reqQty: finalQty,
      appQty: finalQty,
      unit: matchedItem ? matchedItem.unit : (unit || "kg"),
      status: "Pending",
      remarks: remarks || "Branch stock replenishment"
    });

    // Send Notification to HQ / Admin when stock request is raised
    try {
      let bName = "";
      if (branchId && branchId !== "ALL" && mongoose.Types.ObjectId.isValid(branchId)) {
        const bObj: any = await Branch.findById(branchId);
        if (bObj) bName = bObj.branchName || bObj.name || "";
      }
      await Notification.create({
        restaurantId,
        branchId: branchId && branchId !== "ALL" ? branchId : undefined,
        receiverType: "ADMIN",
        type: "STOCK_REQUEST_RAISED",
        requestType: "BranchRequest",
        title: "New Branch Stock Request",
        message: `${bName ? `Branch "${bName}"` : "Branch outlet"} raised Stock Request ${generatedCode} for ${matchedItem ? matchedItem.name : finalItemName} (Qty: ${finalQty} ${unit || "kg"}).`
      });
    } catch (notifErr) {
      console.warn("Stock request notification warning:", notifErr);
    }

    sendSuccess(res, "Stock request submitted successfully", stockReq, StatusCodes.CREATED);
  } catch (error: any) {
    console.error("Create Stock Request Error:", error);
    sendError(res, error?.message || "Failed to create stock request", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getStockRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const branchId = getTargetBranchId(req);

    const query: any = { restaurantId, isDelete: false };
    if (branchId && branchId !== "ALL") query.branchId = branchId;

    const requests = await InventoryRequest.find(query)
      .populate("branchId", "name branchName")
      .populate("itemId", "name unit currentStock")
      .sort({ createdAt: -1 });

    sendSuccess(res, "Stock requests fetched successfully", requests);
  } catch (error: any) {
    console.error("Get Stock Requests Error:", error);
    sendError(res, error?.message || "Failed to fetch stock requests", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const approveStockRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const { id } = req.params;
    const { appQty, remarks } = req.body;

    const stockReq = await InventoryRequest.findOne({ _id: id, restaurantId, isDelete: false });
    if (!stockReq) {
      return sendError(res, "Stock request not found", StatusCodes.NOT_FOUND);
    }

    const approvedQuantity = Number(appQty !== undefined ? appQty : stockReq.reqQty);
    if (approvedQuantity <= 0) {
      return sendError(res, "Valid approved quantity is required", StatusCodes.BAD_REQUEST);
    }

    stockReq.appQty = approvedQuantity;
    stockReq.status = "Approved";
    if (remarks) stockReq.remarks = remarks;

    await stockReq.save();

    // Send Notification to Branch when HQ approves request
    try {
      if (stockReq.branchId) {
        await Notification.create({
          restaurantId,
          branchId: stockReq.branchId,
          receiverType: "ADMIN",
          type: "STOCK_REQUEST_APPROVED",
          requestType: "BranchRequest",
          title: "Stock Request Approved",
          message: `Stock Request ${stockReq.requestNo} for ${stockReq.itemName} (Qty: ${approvedQuantity} ${stockReq.unit}) has been APPROVED by Central HQ.`
        });
      }
    } catch (notifErr) {
      console.warn("Approval notification warning:", notifErr);
    }

    sendSuccess(res, `Stock request approved for ${approvedQuantity} ${stockReq.unit}. Ready for stock distribution.`, stockReq);
  } catch (error: any) {
    console.error("Approve Stock Request Error:", error);
    sendError(res, error?.message || "Failed to approve stock request", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const distributeStockRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const { id } = req.params;
    const { distributedQty, distQty, givenQty, remarks } = req.body;

    const stockReq = await InventoryRequest.findOne({ _id: id, restaurantId, isDelete: false });
    if (!stockReq) {
      return sendError(res, "Stock request not found", StatusCodes.NOT_FOUND);
    }

    const qtyGiven = Number(distributedQty || distQty || givenQty || 0);
    if (qtyGiven <= 0) {
      return sendError(res, "Valid distribution quantity is required", StatusCodes.BAD_REQUEST);
    }

    // Find Central Stock Item
    let centralItem: any = null;
    if (stockReq.itemId) {
      centralItem = await InventoryItem.findOne({ _id: stockReq.itemId, restaurantId, isDelete: false });
    }
    if (!centralItem && stockReq.itemName) {
      centralItem = await InventoryItem.findOne({ name: stockReq.itemName, restaurantId, isDelete: false });
    }

    if (centralItem) {
      const currentCentral = centralItem.currentStock || 0;
      if (currentCentral < qtyGiven) {
        return sendError(res, `Insufficient Central Stock. Current stock is ${currentCentral} ${centralItem.unit}`, StatusCodes.BAD_REQUEST);
      }

      // DECREASE CENTRAL STOCK (- qtyGiven)
      centralItem.currentStock = Math.max(0, currentCentral - qtyGiven);
      if (centralItem.currentStock === 0) {
        (centralItem as any).status = "OUT_OF_STOCK";
      } else if (centralItem.currentStock <= centralItem.minAlertLevel) {
        (centralItem as any).status = "LOW_STOCK";
      }
      await centralItem.save();
    }

    const currentGiven = stockReq.distQty || 0;
    const newTotalGiven = currentGiven + qtyGiven;
    stockReq.distQty = newTotalGiven;

    const targetQty = stockReq.appQty && stockReq.appQty > 0 ? stockReq.appQty : stockReq.reqQty;

    if (newTotalGiven >= targetQty) {
      stockReq.status = "Dispatched";
    } else {
      stockReq.status = "Partially Dispatched";
    }

    if (remarks) stockReq.remarks = remarks;

    await stockReq.save();

    // Send Notification to Branch when HQ distributes stock
    try {
      if (stockReq.branchId) {
        await Notification.create({
          restaurantId,
          branchId: stockReq.branchId,
          receiverType: "ADMIN",
          type: "STOCK_REQUEST_DISPATCHED",
          requestType: "BranchRequest",
          title: "Stock Distributed / Dispatched",
          message: `Stock Request ${stockReq.requestNo} for ${stockReq.itemName}: Distributed ${qtyGiven} ${stockReq.unit} (Total Given: ${newTotalGiven}/${targetQty}).`
        });
      }
    } catch (notifErr) {
      console.warn("Distribution notification warning:", notifErr);
    }

    sendSuccess(res, `Stock distributed successfully (${qtyGiven} ${stockReq.unit}). Central stock updated.`, stockReq);
  } catch (error: any) {
    console.error("Distribute Stock Request Error:", error);
    sendError(res, error?.message || "Failed to distribute stock", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const rejectStockRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const { id } = req.params;

    const stockReq = await InventoryRequest.findOneAndUpdate(
      { _id: id, restaurantId, isDelete: false },
      { status: "Rejected" },
      { new: true }
    );

    if (!stockReq) {
      return sendError(res, "Stock request not found", StatusCodes.NOT_FOUND);
    }

    // Send Notification to Branch when HQ rejects request
    try {
      if (stockReq.branchId) {
        await Notification.create({
          restaurantId,
          branchId: stockReq.branchId,
          receiverType: "ADMIN",
          type: "STOCK_REQUEST_REJECTED",
          requestType: "BranchRequest",
          title: "Stock Request Rejected",
          message: `Stock Request ${stockReq.requestNo} for ${stockReq.itemName} has been REJECTED by Central HQ.`
        });
      }
    } catch (notifErr) {
      console.warn("Rejection notification warning:", notifErr);
    }

    sendSuccess(res, "Stock request rejected", stockReq);
  } catch (error: any) {
    console.error("Reject Stock Request Error:", error);
    sendError(res, error?.message || "Failed to reject stock request", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
