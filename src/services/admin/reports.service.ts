import mongoose from "mongoose";
import Order from "../../models/Order";
import User from "../../models/User";
import UserRole from "../../models/UserRole";
import InventoryItem from "../../models/InventoryItem";

interface DateFilter {
  startDate?: string;
  endDate?: string;
}

const isValidDateStr = (d?: string): boolean => {
  if (!d || d === "undefined" || d === "null" || d.trim() === "") return false;
  const parsed = Date.parse(d);
  return !isNaN(parsed);
};

const buildDateMatch = ({ startDate, endDate }: DateFilter) => {
  const match: any = {};
  if (isValidDateStr(startDate)) {
    const start = new Date(startDate!);
    start.setUTCHours(0, 0, 0, 0);
    match.$gte = start;
  }
  if (isValidDateStr(endDate)) {
    const end = new Date(endDate!);
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
  const restObjId = new mongoose.Types.ObjectId(restaurantId);

  // 1. Find waiter roles dynamically for this restaurant
  const waiterRoles = await UserRole.find({
    restaurantId: restObjId,
    isDelete: false,
    $or: [
      { code: { $regex: /^waiter$/i } },
      { roleName: { $regex: /waiter/i } }
    ]
  }).select("_id");
  const waiterRoleIds = waiterRoles.map((r) => r._id);

  // 2. Build User query to get staff/waiters
  const userQuery: any = {
    restaurantId: restObjId,
    isDelete: false
  };

  if (branchId && branchId.toLowerCase() !== "all" && mongoose.Types.ObjectId.isValid(branchId)) {
    userQuery.branchId = new mongoose.Types.ObjectId(branchId);
  }

  if (waiterId && waiterId.toLowerCase() !== "all" && mongoose.Types.ObjectId.isValid(waiterId)) {
    userQuery._id = new mongoose.Types.ObjectId(waiterId);
  } else if (waiterRoleIds.length > 0) {
    userQuery.$or = [
      { roleId: { $in: waiterRoleIds } },
      { userType: "STAFF" }
    ];
  } else {
    userQuery.userType = "STAFF";
  }

  const staffUsers = await User.find(userQuery).populate("roleId", "roleName code").lean();

  // 3. Aggregate completed / served orders
  const orderMatch: any = {
    restaurantId: restObjId,
    isDelete: false,
    status: { $in: ["completed", "served", "done"] },
    waiterId: { $exists: true, $ne: null },
    ...dateMatch
  };

  if (branchId && branchId.toLowerCase() !== "all" && mongoose.Types.ObjectId.isValid(branchId)) {
    orderMatch.branchId = new mongoose.Types.ObjectId(branchId);
  }

  if (waiterId && waiterId.toLowerCase() !== "all" && mongoose.Types.ObjectId.isValid(waiterId)) {
    orderMatch.waiterId = new mongoose.Types.ObjectId(waiterId);
  }

  const orderStats = await Order.aggregate([
    { $match: orderMatch },
    {
      $group: {
        _id: "$waiterId",
        ordersServed: { $sum: 1 },
        totalRevenue: { $sum: "$total" }
      }
    }
  ]);

  const statsMap = new Map<string, { ordersServed: number; totalRevenue: number }>();
  orderStats.forEach((stat: any) => {
    if (stat._id) {
      statsMap.set(stat._id.toString(), {
        ordersServed: stat.ordersServed || 0,
        totalRevenue: stat.totalRevenue || 0
      });
    }
  });

  // 4. Combine staff user details with order stats
  const staffUserIdsSeen = new Set<string>();

  let results = staffUsers.map((u: any) => {
    const uIdStr = u._id.toString();
    staffUserIdsSeen.add(uIdStr);
    const stat = statsMap.get(uIdStr) || { ordersServed: 0, totalRevenue: 0 };
    const avgOrderVal = stat.ordersServed > 0 ? parseFloat((stat.totalRevenue / stat.ordersServed).toFixed(2)) : 0;

    return {
      id: u._id,
      waiterId: u._id,
      name: u.name || "Unknown Staff",
      waiterName: u.name || "Unknown Staff",
      email: u.email || "",
      phone: u.phoneNumber || u.phone || "",
      phoneNumber: u.phoneNumber || u.phone || "",
      dutyStatus: u.dutyStatus || "ON_DUTY",
      status: u.dutyStatus === "ON_DUTY" ? "On Duty" : "Off Duty",
      ordersServed: stat.ordersServed,
      totalOrders: stat.ordersServed,
      totalRevenue: stat.totalRevenue,
      revenue: stat.totalRevenue,
      averageOrderValue: avgOrderVal,
      avgOrder: avgOrderVal
    };
  });

  // If there are order stats for waiterIds not in staffUsers list (e.g. unlisted staff)
  for (const [wId, stat] of statsMap.entries()) {
    if (!staffUserIdsSeen.has(wId)) {
      const avgOrderVal = stat.ordersServed > 0 ? parseFloat((stat.totalRevenue / stat.ordersServed).toFixed(2)) : 0;
      results.push({
        id: wId,
        waiterId: wId,
        name: "Staff #" + wId.slice(-4),
        waiterName: "Staff #" + wId.slice(-4),
        email: "",
        phone: "",
        phoneNumber: "",
        dutyStatus: "ON_DUTY",
        status: "On Duty",
        ordersServed: stat.ordersServed,
        totalOrders: stat.ordersServed,
        totalRevenue: stat.totalRevenue,
        revenue: stat.totalRevenue,
        averageOrderValue: avgOrderVal,
        avgOrder: avgOrderVal
      });
    }
  }

  if (search) {
    const s = search.toLowerCase();
    results = results.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        r.email.toLowerCase().includes(s) ||
        r.phone.toLowerCase().includes(s)
    );
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
    status: "completed",
    ...dateMatch
  };

  if (branchId && branchId.toLowerCase() !== "all") {
    orderMatch.branchId = new mongoose.Types.ObjectId(branchId);
  }

  const pipeline: any[] = [
    { $match: orderMatch },
    { $unwind: "$items" },
    { $match: { "items.status": { $in: ["ready", "served", "completed"] } } }
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
    kitchenStatus: "Completed"
  }));

  if (search) {
    const s = search.toLowerCase();
    results = results.filter((r) => r.foodItem.toLowerCase().includes(s) || (r.category && r.category.toLowerCase().includes(s)));
  }

  return results;
};

export const getTaxSettlementReport = async (
  restaurantId: string,
  branchId?: string,
  paymentMethod?: string,
  search?: string,
  dates?: DateFilter
) => {
  const dateMatch = buildDateMatch(dates || {});
  const restObjId = new mongoose.Types.ObjectId(restaurantId);

  const baseMatch: any = {
    restaurantId: restObjId,
    isDelete: false,
    ...dateMatch
  };

  if (branchId && branchId.toLowerCase() !== "all" && mongoose.Types.ObjectId.isValid(branchId)) {
    baseMatch.branchId = new mongoose.Types.ObjectId(branchId);
  }

  if (paymentMethod && paymentMethod.toLowerCase() !== "all") {
    baseMatch.paymentMethod = paymentMethod.toLowerCase();
  }

  let orders = await Order.find(baseMatch)
    .populate("branchId", "branchName branchCode")
    .populate("tableId", "tableNumber section")
    .sort({ createdAt: -1 })
    .lean();

  if (search) {
    const s = search.toLowerCase();
    orders = orders.filter((o: any) => {
      const orderIdStr = (o.orderId || "").toLowerCase();
      const pMethodStr = (o.paymentMethod || "").toLowerCase();
      const statusStr = (o.status || "").toLowerCase();
      const branchNameStr = (o.branchId?.branchName || "").toLowerCase();
      const tableNumStr = (o.tableId?.tableNumber || "").toLowerCase();

      return (
        orderIdStr.includes(s) ||
        pMethodStr.includes(s) ||
        statusStr.includes(s) ||
        branchNameStr.includes(s) ||
        tableNumStr.includes(s)
      );
    });
  }

  let totalTaxableAmount = 0;
  let totalTaxCollected = 0;
  let totalPaymentsCollected = 0;
  let refundAmount = 0;

  const methodMap: Record<string, { method: string; count: number; taxable: number; tax: number; total: number }> = {
    "UPI": { method: "UPI", count: 0, taxable: 0, tax: 0, total: 0 },
    "Cash": { method: "Cash", count: 0, taxable: 0, tax: 0, total: 0 },
    "Credit / Debit Card": { method: "Credit / Debit Card", count: 0, taxable: 0, tax: 0, total: 0 },
    "Net Banking": { method: "Net Banking", count: 0, taxable: 0, tax: 0, total: 0 }
  };

  const dataList = orders.map((o: any) => {
    const isCancelled = o.status === "cancelled";
    const isPaid = o.billingStatus === "paid" || o.status === "completed";

    const taxableAmount = isCancelled ? 0 : (o.subtotal || 0);
    const taxAmount = isCancelled ? 0 : (o.tax || 0);
    const totalAmount = isCancelled ? 0 : (o.total || 0);
    const refund = isCancelled ? (o.total || 0) : 0;

    if (!isCancelled && isPaid) {
      totalTaxableAmount += taxableAmount;
      totalTaxCollected += taxAmount;
      totalPaymentsCollected += totalAmount;

      const pmRaw = (o.paymentMethod || "").toLowerCase();
      let key = "Cash";
      if (pmRaw.includes("upi")) key = "UPI";
      else if (pmRaw.includes("card") || pmRaw.includes("credit") || pmRaw.includes("debit")) key = "Credit / Debit Card";
      else if (pmRaw.includes("bank") || pmRaw.includes("net")) key = "Net Banking";
      else if (pmRaw.includes("cash")) key = "Cash";
      else key = "Cash";

      if (!methodMap[key]) {
        methodMap[key] = { method: key, count: 0, taxable: 0, tax: 0, total: 0 };
      }

      methodMap[key].count += 1;
      methodMap[key].taxable += taxableAmount;
      methodMap[key].tax += taxAmount;
      methodMap[key].total += totalAmount;
    }

    if (isCancelled) {
      refundAmount += refund;
    }

    return {
      id: o._id.toString(),
      orderId: o.orderId,
      invoiceId: `INV-${o.orderId?.replace(/[^0-9]/g, "") || o._id.toString().slice(-6)}`,
      branchId: o.branchId?._id?.toString() || o.branchId?.toString(),
      branchName: o.branchId?.branchName || "Main Branch",
      tableNumber: o.tableId?.tableNumber || "N/A",
      taxableAmount: o.subtotal || 0,
      taxAmount: o.tax || 0,
      discount: o.discount || 0,
      charge: o.charge || 0,
      totalAmount: o.total || 0,
      refundAmount: refund,
      paymentMethod: o.paymentMethod || "N/A",
      paymentStatus: isPaid ? "Paid" : (isCancelled ? "Refunded" : "Pending"),
      orderStatus: o.status,
      createdAt: o.createdAt
    };
  });

  const paymentSettlementTable = Object.values(methodMap);

  const halfTax = totalTaxCollected / 2;
  const gstTaxBreakdown = [
    {
      taxType: "CGST",
      taxRate: "2.5%",
      taxableAmount: totalTaxableAmount,
      taxAmount: parseFloat(halfTax.toFixed(2))
    },
    {
      taxType: "SGST",
      taxRate: "2.5%",
      taxableAmount: totalTaxableAmount,
      taxAmount: parseFloat(halfTax.toFixed(2))
    },
    {
      taxType: "Total GST",
      taxRate: "5.0%",
      taxableAmount: totalTaxableAmount,
      taxAmount: parseFloat(totalTaxCollected.toFixed(2))
    }
  ];

  return {
    summary: {
      totalTaxableAmount,
      totalTaxCollected,
      totalPaymentsCollected,
      refundAmount
    },
    paymentSettlementTable,
    gstTaxBreakdown,
    results: dataList
  };
};

export const getSalesRevenueReport = async (
  restaurantId: string,
  branchId?: string,
  search?: string,
  dates?: DateFilter
) => {
  const dateMatch = buildDateMatch(dates || {});
  const restObjId = new mongoose.Types.ObjectId(restaurantId);

  const match: any = {
    restaurantId: restObjId,
    isDelete: false,
    status: { $ne: "cancelled" },
    ...dateMatch
  };

  if (branchId && branchId.toLowerCase() !== "all" && mongoose.Types.ObjectId.isValid(branchId)) {
    match.branchId = new mongoose.Types.ObjectId(branchId);
  }

  const orders = await Order.find(match).sort({ createdAt: -1 }).lean();

  let grossSales = 0;
  let totalDiscounts = 0;
  let totalTax = 0;
  let netRevenue = 0;

  orders.forEach((o: any) => {
    grossSales += o.subtotal || 0;
    totalDiscounts += o.discount || 0;
    totalTax += o.tax || 0;
    netRevenue += o.total || 0;
  });

  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? parseFloat((netRevenue / totalOrders).toFixed(2)) : 0;

  return {
    summary: {
      grossSales,
      totalDiscounts,
      totalTax,
      netRevenue,
      totalOrders,
      avgOrderValue
    },
    results: orders.map((o: any) => ({
      id: o._id,
      orderId: o.orderId,
      subtotal: o.subtotal,
      discount: o.discount,
      tax: o.tax,
      total: o.total,
      paymentMethod: o.paymentMethod || "N/A",
      createdAt: o.createdAt
    }))
  };
};

export const getDishPerformanceReport = async (
  restaurantId: string,
  branchId?: string,
  categoryId?: string,
  search?: string,
  dates?: DateFilter
) => {
  return getKitchenReport(restaurantId, branchId, categoryId, search, dates);
};

export const getOrderAnalyticsReport = async (
  restaurantId: string,
  branchId?: string,
  search?: string,
  dates?: DateFilter
) => {
  const dateMatch = buildDateMatch(dates || {});
  const restObjId = new mongoose.Types.ObjectId(restaurantId);

  const match: any = {
    restaurantId: restObjId,
    isDelete: false,
    ...dateMatch
  };

  if (branchId && branchId.toLowerCase() !== "all" && mongoose.Types.ObjectId.isValid(branchId)) {
    match.branchId = new mongoose.Types.ObjectId(branchId);
  }

  const orders = await Order.find(match).lean();

  const totalOrders = orders.length;
  const completedOrders = orders.filter((o: any) => o.status === "completed" || o.status === "served").length;
  const cancelledOrders = orders.filter((o: any) => o.status === "cancelled").length;
  const pendingOrders = orders.filter((o: any) => ["new", "preparing", "ready"].includes(o.status)).length;
  const totalRevenue = orders.filter((o: any) => o.status !== "cancelled").reduce((sum: number, o: any) => sum + (o.total || 0), 0);

  return {
    summary: {
      totalOrders,
      completedOrders,
      cancelledOrders,
      pendingOrders,
      totalRevenue,
      completionRate: totalOrders > 0 ? parseFloat(((completedOrders / totalOrders) * 100).toFixed(1)) : 0
    },
    results: orders
  };
};

export const getInventoryStockReport = async (
  restaurantId: string,
  branchId?: string,
  search?: string
) => {
  const restObjId = new mongoose.Types.ObjectId(restaurantId);
  const match: any = {
    restaurantId: restObjId,
    isDelete: false
  };

  if (branchId && branchId.toLowerCase() !== "all" && mongoose.Types.ObjectId.isValid(branchId)) {
    match.branchId = new mongoose.Types.ObjectId(branchId);
  }

  const items = await InventoryItem.find(match)
    .populate("categoryId", "name categoryName")
    .sort({ name: 1 })
    .lean();

  let totalItems = items.length;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let totalInventoryValue = 0;

  const data = items.map((item: any) => {
    const isLow = item.currentStock <= item.minAlertLevel && item.currentStock > 0;
    const isOut = item.currentStock <= 0;
    if (isLow) lowStockCount++;
    if (isOut) outOfStockCount++;
    const value = (item.currentStock || 0) * (item.costPerUnit || 0);
    totalInventoryValue += value;

    return {
      id: item._id,
      name: item.name,
      sku: item.sku,
      category: item.categoryId?.categoryName || item.categoryId?.name || "Uncategorized",
      currentStock: item.currentStock,
      minAlertLevel: item.minAlertLevel,
      unit: item.unit,
      costPerUnit: item.costPerUnit,
      totalValue: value,
      status: isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"
    };
  });

  return {
    summary: {
      totalItems,
      lowStockCount,
      outOfStockCount,
      totalInventoryValue
    },
    results: data
  };
};

export const getStaffPerformanceReport = async (
  restaurantId: string,
  branchId?: string,
  search?: string,
  dates?: DateFilter
) => {
  return getWaiterReport(restaurantId, branchId, undefined, search, dates);
};


