import mongoose from "mongoose";
import Menu from "../../models/Menu";
import Category from "../../models/Category";
import Branch from "../../models/Branch";
import { resolveMenuBranchId } from "../../utils/menuUtils";

export const getMenuItems = async (
  restaurantId: string,
  branchId: string | undefined,
  categoryFilter?: string,
  availableFilter?: string,
  skip: number = 0,
  limit: number = 10,
  search?: string
) => {
  const query: any = { restaurantId, isDelete: false };

  // Fetch all branches that have useCustomMenu enabled for this restaurant
  const customBranches = await Branch.find({
    restaurantId,
    useCustomMenu: true,
    isDelete: false
  }).select("_id");
  const customBranchIds = customBranches.map(b => b._id);

  if (branchId && branchId !== "ALL" && branchId !== "All" && branchId !== "all") {
    if (branchId === "COMPANY" || branchId === "company") {
      // Explicitly requested Company Menu only
      query.$or = [
        { isCompanyMenu: true },
        { branchId: { $nin: customBranchIds } }
      ];
    } else {
      let branchDoc: any = null;
      const branchIdStr = String(branchId).trim();
      if (mongoose.Types.ObjectId.isValid(branchIdStr)) {
        branchDoc = await Branch.findOne({ _id: branchIdStr, restaurantId, isDelete: false });
      }
      if (!branchDoc) {
        branchDoc = await Branch.findOne({
          restaurantId,
          $or: [{ branchCode: branchIdStr }, { branchName: branchIdStr }],
          isDelete: false
        });
      }

      // CONDITION: Check useCustomMenu flag using branchId
      const isCustomMenu = branchDoc && (branchDoc.useCustomMenu === true || String(branchDoc.useCustomMenu) === "true");

      if (isCustomMenu) {
        // Branch has custom menu enabled:
        // Company menu must NEVER show for this branch!
        // Only show items specifically created for this custom branch.
        query.branchId = branchDoc._id;
        query.isCompanyMenu = { $ne: true };
      } else {
        // Branch uses Company Menu:
        // Show Company Menu dishes (isCompanyMenu: true OR dishes not belonging to custom branches)
        query.$or = [
          { isCompanyMenu: true },
          { branchId: { $nin: customBranchIds } }
        ];
      }
    }
  } else {
    // "All Branches" view (branchId is 'ALL' or not specified):
    // Show ALL menus: both Company Menu AND individual branch custom menus!
    // No branch restriction applied.
  }

  if (categoryFilter && categoryFilter !== 'All Items') query.category = categoryFilter;
  if (availableFilter !== undefined) query.available = availableFilter === 'true';
  if (search) {
    const searchCondition = {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { desc: { $regex: search, $options: 'i' } }
      ]
    };
    if (query.$or) {
      query.$and = [
        { $or: query.$or },
        searchCondition
      ];
      delete query.$or;
    } else {
      query.$or = searchCondition.$or;
    }
  }

  const total = await Menu.countDocuments(query);
  const items = await Menu.find(query)
    .populate('category', 'name _id image')
    .populate('branchId', 'branchName branchCode useCustomMenu')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return { total, items };
};

export const createMenuItem = async (restaurantId: string, branchId: string, itemData: any) => {
  const newItem = new Menu({
    ...itemData,
    restaurantId,
    branchId,
  });
  await newItem.save();
  return newItem;
};

export const updateMenuItem = async (restaurantId: string, branchId: string, itemId: string, itemData: any) => {
  const item = await Menu.findOne({ _id: itemId, restaurantId, isDelete: false });
  if (!item) throw new Error("Menu item not found");

  if (itemData.name !== undefined) item.name = itemData.name;
  if (itemData.desc !== undefined) item.desc = itemData.desc;
  if (itemData.price !== undefined) item.price = itemData.price;
  if (itemData.category !== undefined) item.category = itemData.category;
  if (itemData.gst !== undefined) item.gst = itemData.gst;
  if (itemData.veg !== undefined) item.veg = itemData.veg;
  if (itemData.available !== undefined) item.available = itemData.available;
  if (itemData.bestseller !== undefined) item.bestseller = itemData.bestseller;
  if (itemData.image !== undefined) item.image = itemData.image;
  if (itemData.coverImage !== undefined) item.coverImage = itemData.coverImage;
  if (itemData.branchId !== undefined && itemData.branchId) {
    item.branchId = itemData.branchId;
  }
  if (itemData.isCompanyMenu !== undefined) {
    item.isCompanyMenu = itemData.isCompanyMenu;
  }

  await item.save();
  return item;
};

export const toggleMenuItemAvailability = async (restaurantId: string, branchId: string, itemId: string, available: boolean) => {
  const item = await Menu.findOne({ _id: itemId, restaurantId, isDelete: false });
  if (!item) throw new Error("Menu item not found");

  item.available = available;
  await item.save();
  return item;
};

export const deleteMenuItem = async (restaurantId: string, branchId: string, itemId: string) => {
  const item = await Menu.findOne({ _id: itemId, restaurantId, isDelete: false });
  if (!item) throw new Error("Menu item not found");

  item.isDelete = true;
  item.isActive = false;
  await item.save();
  return true;
};

export const getCategories = async (restaurantId: string, branchId: string | undefined, skip: number = 0, limit: number = 0, search: string = "") => {
  // Categories are shared company-wide for the restaurant
  const query: any = { restaurantId };
  
  if (search) {
    query.name = { $regex: search, $options: "i" };
  }

  if (limit > 0) {
    const total = await Category.countDocuments(query);
    const items = await Category.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
    return { total, items };
  } else {
    const categories = await Category.find(query).sort({ createdAt: -1 });
    return { total: categories.length, items: categories };
  }
};

export const updateCategory = async (restaurantId: string, branchId: string, categoryId: string, updateData: any) => {
  const cat = await Category.findOneAndUpdate(
    { _id: categoryId, restaurantId },
    { $set: updateData },
    { new: true }
  );
  if (!cat) throw new Error("Category not found");
  return cat;
};

export const deleteCategory = async (restaurantId: string, branchId: string, categoryId: string) => {
  const cat = await Category.findOneAndDelete({ _id: categoryId, restaurantId });
  if (!cat) throw new Error("Category not found");
  return true;
};

export const createCategory = async (restaurantId: string, branchId: string, catData: any) => {
  const category = new Category({
    restaurantId,
    branchId,
    name: catData.name,
    description: catData.description || "",
    image: catData.image || "",
    status: catData.status || "AVAILABLE"
  });

  await category.save();
  return category;
};
