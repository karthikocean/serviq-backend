import Menu from "../../models/Menu";
import Category from "../../models/Category";

export const getMenuItems = async (restaurantId: string, branchId: string, categoryFilter?: string, availableFilter?: string) => {
  const query: any = { restaurantId, branchId, isDelete: false };
  if (categoryFilter) query.category = categoryFilter;
  if (availableFilter !== undefined) query.available = availableFilter === 'true';

  return await Menu.find(query);
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
  await item.save();
  return true;
};

export const getCategories = async (restaurantId: string, branchId: string) => {
  const categories = await Category.find({ restaurantId, branchId }).sort({ order: 1 });
  return categories.map(c => c.name);
};

export const addCategories = async (restaurantId: string, branchId: string, newCategories: string[]) => {
  for (let i = 0; i < newCategories.length; i++) {
    const name = newCategories[i];
    await Category.findOneAndUpdate(
      { restaurantId, branchId, name },
      { order: i },
      { upsert: true, new: true }
    );
  }
  return await getCategories(restaurantId, branchId);
};
