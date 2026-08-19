import Menu from "../../models/Menu";
import Category from "../../models/Category";

export const getMenuItems = async (
  restaurantId: string,
  branchId: string,
  categoryFilter?: string,
  availableFilter?: string,
  skip: number = 0,
  limit: number = 10,
  search?: string
) => {
  const query: any = { restaurantId, branchId, isDelete: false };
  if (categoryFilter && categoryFilter !== 'All Items') query.category = categoryFilter;
  if (availableFilter !== undefined) query.available = availableFilter === 'true';
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { desc: { $regex: search, $options: 'i' } }
    ];
  }

  const total = await Menu.countDocuments(query);
  const items = await Menu.find(query)
    .populate('category', 'name _id')
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
  const item = await Menu.findOne({ _id: itemId, restaurantId, branchId, isDelete: false });
  if (!item) throw new Error("Menu item not found");

  if (itemData.name !== undefined) item.name = itemData.name;
  if (itemData.desc !== undefined) item.desc = itemData.desc;
  if (itemData.price !== undefined) item.price = itemData.price;
  if (itemData.category !== undefined) item.category = itemData.category;
  if (itemData.gst !== undefined) item.gst = itemData.gst;
  if (itemData.veg !== undefined) item.veg = itemData.veg;
  if (itemData.available !== undefined) item.available = itemData.available;
  if (itemData.image !== undefined) item.image = itemData.image;
  if (itemData.coverImage !== undefined) item.coverImage = itemData.coverImage;

  await item.save();
  return item;
};

export const toggleMenuItemAvailability = async (restaurantId: string, branchId: string, itemId: string, available: boolean) => {
  const item = await Menu.findOne({ _id: itemId, restaurantId, branchId, isDelete: false });
  if (!item) throw new Error("Menu item not found");

  item.available = available;
  await item.save();
  return item;
};

export const deleteMenuItem = async (restaurantId: string, branchId: string, itemId: string) => {
  const item = await Menu.findOne({ _id: itemId, restaurantId, branchId, isDelete: false });
  if (!item) throw new Error("Menu item not found");

  item.isDelete = true;
  item.isActive = false;
  await item.save();
  return true;
};

export const getCategories = async (restaurantId: string, branchId: string, skip: number = 0, limit: number = 0, search: string = "") => {
  const query: any = { restaurantId, branchId };
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
    { _id: categoryId, restaurantId, branchId },
    { $set: updateData },
    { new: true }
  );
  if (!cat) throw new Error("Category not found");
  return cat;
};

export const deleteCategory = async (restaurantId: string, branchId: string, categoryId: string) => {
  const cat = await Category.findOneAndDelete({ _id: categoryId, restaurantId, branchId });
  if (!cat) throw new Error("Category not found");
  return true;
};

export const createCategory = async (restaurantId: string, branchId: string, catData: any) => {
  const category = new Category({
    restaurantId,
    branchId,
    name: catData.name,
    description: catData.description || "",
    status: catData.status || "AVAILABLE"
  });

  await category.save();
  return category;
};
