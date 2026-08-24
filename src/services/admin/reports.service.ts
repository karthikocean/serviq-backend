import mongoose from "mongoose";
import Order from "../../models/Order";
import User from "../../models/User";
import Role from "../../models/Role";

interface DateFilter {
  startDate?: string;
  endDate?: string;
}

const buildDateMatch = ({ startDate, endDate }: DateFilter) => {
  const match: any = {};
  if (startDate) {
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    match.$gte = start;
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);
    match.$lte = end;
  }
  return Object.keys(match).length > 0 ? { createdAt: match } : {};
};

export const getWaiterReport = async (
  restaurantId: string,
  branchId?: string,
  waiterId?: string,
  search?: string,
  dates?: DateFilter
) => {
  const dateMatch = buildDateMatch(dates || {});
  
  // 1. Find the WAITER role for this restaurant
  const waiterRole = await Role.findOne({ restaurantId, code: "WAITER" });
  if (!waiterRole) {
    return []; // No waiter role seeded yet
  }

  // 2. Base match for Orders
  const orderMatch: any = {
    restaurantId: new mongoose.Types.ObjectId(restaurantId),
    status: "completed",
    isDelete: false,
    ...dateMatch
  };

  if (branchId && branchId.toLowerCase() !== "all") {
    orderMatch.branchId = new mongoose.Types.ObjectId(branchId);
  }
  if (waiterId && waiterId.toLowerCase() !== "all") {
    orderMatch.waiterId = new mongoose.Types.ObjectId(waiterId);
  } else {
    orderMatch.waiterId = { $exists: true, $ne: null };
  }

  // 3. Aggregate Orders
  const stats = await Order.aggregate([
    { $match: orderMatch },
    {
      $group: {
        _id: "$waiterId",
        ordersServed: { $sum: 1 },
        totalRevenue: { $sum: "$total" }
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "waiterDetails"
      }
    },
    { $unwind: "$waiterDetails" },
    // Filter only those who actually have the WAITER role
    {
      $match: {
        "waiterDetails.roleId": waiterRole._id
      }
    }
  ]);

  let results = stats.map((stat: any) => ({
    waiterId: stat._id,
    waiterName: stat.waiterDetails.name,
    dutyStatus: stat.waiterDetails.dutyStatus,
    ordersServed: stat.ordersServed,
    totalRevenue: stat.totalRevenue,
    averageOrderValue: stat.ordersServed > 0 ? parseFloat((stat.totalRevenue / stat.ordersServed).toFixed(2)) : 0
  }));

  if (search) {
    const s = search.toLowerCase();
    results = results.filter((r) => r.waiterName.toLowerCase().includes(s));
  }

  return results;
};

export const getKitchenReport = async (
  restaurantId: string,
  branchId?: string,
  categoryId?: string,
  search?: string,
  dates?: DateFilter
) => {
  const dateMatch = buildDateMatch(dates || {});

  const orderMatch: any = {
    restaurantId: new mongoose.Types.ObjectId(restaurantId),
    isDelete: false,
    ...dateMatch
  };

  if (branchId && branchId.toLowerCase() !== "all") {
    orderMatch.branchId = new mongoose.Types.ObjectId(branchId);
  }

  const pipeline: any[] = [
    { $match: orderMatch },
    { $unwind: "$items" },
    { $match: { "items.status": "completed" } } // Only consider completed items
  ];

  pipeline.push(
    {
      $lookup: {
        from: "menus",
        localField: "items.menuId",
        foreignField: "_id",
        as: "menuDetails"
      }
    },
    { $unwind: "$menuDetails" }
  );

  if (categoryId && categoryId.toLowerCase() !== "all") {
    pipeline.push({
      $match: {
        "menuDetails.categoryId": new mongoose.Types.ObjectId(categoryId)
      }
    });
  }

  pipeline.push(
    {
      $lookup: {
        from: "categories",
        localField: "menuDetails.categoryId",
        foreignField: "_id",
        as: "categoryDetails"
      }
    },
    {
      $unwind: {
        path: "$categoryDetails",
        preserveNullAndEmptyArrays: true
      }
    }
  );

  pipeline.push({
    $group: {
      _id: "$items.menuId",
      foodItem: { $first: "$items.name" },
      category: { $first: "$categoryDetails.categoryName" },
      categoryId: { $first: "$categoryDetails._id" },
      quantityPrepared: { $sum: "$items.qty" },
      revenueGenerated: { $sum: { $multiply: ["$items.qty", "$items.price"] } }
    }
  });

  const stats = await Order.aggregate(pipeline);

  let results = stats.map((stat: any) => ({
    menuId: stat._id,
    foodItem: stat.foodItem,
    category: stat.category || "Uncategorized",
    categoryId: stat.categoryId,
    quantityPrepared: stat.quantityPrepared,
    revenueGenerated: stat.revenueGenerated,
    avgPrepTime: "N/A",
    kitchenStatus: "Completed" // Since we filtered by "completed"
  }));

  if (search) {
    const s = search.toLowerCase();
    results = results.filter((r) => r.foodItem.toLowerCase().includes(s) || (r.category && r.category.toLowerCase().includes(s)));
  }

  return results;
};
