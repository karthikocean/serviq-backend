import mongoose from "mongoose";
import Order from "../../models/Order";
import User from "../../models/User";
import UserRole from "../../models/UserRole";
import InventoryItem from "../../models/InventoryItem";
import Billing from "../../models/Billing";
import Menu from "../../models/Menu";
import Category from "../../models/Category";
import InventoryPurchase from "../../models/InventoryPurchase";
import InventoryReduction from "../../models/InventoryReduction";

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

export interface TaxSettlementFilter {
  branchId?: string;
  preset?: string; // 'today' | 'yesterday' | 'last7days' | 'thisMonth' | 'allTime' | 'custom'
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  search?: string;
  taxType?: string; // 'all' | 'cgst' | 'sgst' | 'igst'
  paymentMethod?: string; // 'all' | 'upi' | 'card' | 'cash'
  tab?: string; // 'tax_summary' | 'payment_settlement'
  page?: number;
  limit?: number;
}

export const getTaxSettlementReport = async (
  restaurantId: string,
  filtersOrBranchId?: TaxSettlementFilter | string,
  paymentMethodLegacy?: string,
  searchLegacy?: string,
  datesLegacy?: DateFilter
) => {
  let branchId: string | undefined;
  let preset: string | undefined;
  let startDate: string | undefined;
  let endDate: string | undefined;
  let searchQuery: string | undefined;
  let taxType: string | undefined;
  let paymentMethod: string | undefined;
  let tab = "tax_summary";
  let page = 1;
  let limit = 10;

  if (typeof filtersOrBranchId === "object" && filtersOrBranchId !== null) {
    branchId = filtersOrBranchId.branchId;
    preset = filtersOrBranchId.preset;
    startDate = filtersOrBranchId.startDate;
    endDate = filtersOrBranchId.endDate;
    searchQuery = filtersOrBranchId.searchQuery || filtersOrBranchId.search;
    taxType = filtersOrBranchId.taxType;
    paymentMethod = filtersOrBranchId.paymentMethod;
    tab = filtersOrBranchId.tab || "tax_summary";
    page = filtersOrBranchId.page !== undefined ? Number(filtersOrBranchId.page) : 1;
    limit = filtersOrBranchId.limit !== undefined ? Number(filtersOrBranchId.limit) : 10;
  } else {
    branchId = filtersOrBranchId;
    paymentMethod = paymentMethodLegacy;
    searchQuery = searchLegacy;
    startDate = datesLegacy?.startDate;
    endDate = datesLegacy?.endDate;
  }

  const dateMatch = buildSalesDateMatch(preset, startDate, endDate);
  const restObjId = new mongoose.Types.ObjectId(restaurantId);

  const baseMatch: any = {
    restaurantId: restObjId,
    isDelete: false,
    ...dateMatch
  };

  if (branchId && branchId.toLowerCase() !== "all" && mongoose.Types.ObjectId.isValid(branchId)) {
    baseMatch.branchId = new mongoose.Types.ObjectId(branchId);
  }

  if (paymentMethod && paymentMethod.toLowerCase() !== "all" && paymentMethod.toLowerCase() !== "all payment methods") {
    baseMatch.paymentMethod = new RegExp(`^${paymentMethod.trim()}$`, "i");
  }

  let orders = await Order.find(baseMatch)
    .populate("branchId", "branchName branchCode")
    .populate("tableId", "tableNumber section")
    .sort({ createdAt: -1 })
    .lean();

  if (searchQuery && searchQuery.trim() !== "") {
    const s = searchQuery.toLowerCase().trim();
    orders = orders.filter((o: any) => {
      const orderIdStr = (o.orderId || "").toLowerCase();
      const pMethodStr = (o.paymentMethod || "").toLowerCase();
      const statusStr = (o.status || "").toLowerCase();
      const tableNumStr = (o.tableId?.tableNumber || "").toLowerCase();

      return (
        orderIdStr.includes(s) ||
        pMethodStr.includes(s) ||
        statusStr.includes(s) ||
        tableNumStr.includes(s)
      );
    });
  }

  let totalTaxableAmount = 0;
  let totalTaxCollected = 0;
  let totalPaymentsCollected = 0;
  let refundAmount = 0;

  const methodMap: Record<string, { sNo: number; paymentMethod: string; transactionCount: number; taxableAmount: number; taxAmount: number; totalAmount: number }> = {
    "UPI": { sNo: 1, paymentMethod: "UPI", transactionCount: 0, taxableAmount: 0, taxAmount: 0, totalAmount: 0 },
    "Cash": { sNo: 2, paymentMethod: "Cash", transactionCount: 0, taxableAmount: 0, taxAmount: 0, totalAmount: 0 },
    "Credit / Debit Card": { sNo: 3, paymentMethod: "Credit / Debit Card", transactionCount: 0, taxableAmount: 0, taxAmount: 0, totalAmount: 0 },
    "Net Banking": { sNo: 4, paymentMethod: "Net Banking", transactionCount: 0, taxableAmount: 0, taxAmount: 0, totalAmount: 0 }
  };

  const dataList = orders.map((o: any) => {
    const isCancelled = o.status === "cancelled";
    const isPaid = o.billingStatus === "paid" || o.status === "completed" || o.status === "served";

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
      else key = "Cash";

      if (methodMap[key]) {
        methodMap[key].transactionCount += 1;
        methodMap[key].taxableAmount += taxableAmount;
        methodMap[key].taxAmount += taxAmount;
        methodMap[key].totalAmount += totalAmount;
      }
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

  const paymentSettlementTable = Object.values(methodMap).map(m => ({
    ...m,
    taxableAmount: parseFloat(m.taxableAmount.toFixed(2)),
    taxAmount: parseFloat(m.taxAmount.toFixed(2)),
    totalAmount: parseFloat(m.totalAmount.toFixed(2))
  }));

  const halfTax = totalTaxCollected / 2;
  let taxSummaryTable = [
    {
      taxType: "CGST",
      taxRate: "2.5%",
      taxableAmount: parseFloat(totalTaxableAmount.toFixed(2)),
      taxAmount: parseFloat(halfTax.toFixed(2))
    },
    {
      taxType: "SGST",
      taxRate: "2.5%",
      taxableAmount: parseFloat(totalTaxableAmount.toFixed(2)),
      taxAmount: parseFloat(halfTax.toFixed(2))
    }
  ];

  if (taxType && taxType.toLowerCase() !== "all" && taxType.toLowerCase() !== "all taxes") {
    const tStr = taxType.toLowerCase();
    taxSummaryTable = taxSummaryTable.filter(t => t.taxType.toLowerCase().includes(tStr));
  }

  const summary = {
    totalTaxableAmount: parseFloat(totalTaxableAmount.toFixed(2)),
    totalTaxCollected: parseFloat(totalTaxCollected.toFixed(2)),
    totalPaymentsCollected: parseFloat(totalPaymentsCollected.toFixed(2)),
    refundAmount: parseFloat(refundAmount.toFixed(2))
  };

  const tableSummary = {
    totalTaxableAmount: parseFloat(totalTaxableAmount.toFixed(2)),
    totalTaxAmount: parseFloat(totalTaxCollected.toFixed(2))
  };

  const selectedTableData = (tab === "payment_settlement" || tab === "settlement") ? paymentSettlementTable : taxSummaryTable;

  return {
    summary,
    tableSummary,
    taxSummaryTable,
    paymentSettlementTable,
    gstTaxBreakdown: taxSummaryTable,
    totalRecords: selectedTableData.length,
    totalPages: 1,
    currentPage: page,
    limit,
    data: selectedTableData,
    results: dataList
  };
};

export interface SalesReportFilter {
  branchId?: string;
  preset?: string; // 'today' | 'yesterday' | 'last7days' | 'thisMonth' | 'allTime' | 'custom'
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  search?: string;
  paymentMethod?: string; // 'all' | 'upi' | 'card' | 'cash'
  orderType?: string; // 'all' | 'dine_in' | 'takeaway' | 'delivery'
  page?: number;
  limit?: number;
}

const buildSalesDateMatch = (preset?: string, startDate?: string, endDate?: string) => {
  const match: any = {};

  if (preset && preset.toLowerCase() !== "custom" && preset.toLowerCase() !== "all time" && preset.toLowerCase() !== "alltime" && preset.toLowerCase() !== "all") {
    const start = new Date();
    const end = new Date();

    const p = preset.toLowerCase().replace(/_/g, "").replace(/\s+/g, "");

    if (p === "today") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (p === "yesterday") {
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
    } else if (p === "last7days" || p === "last7") {
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (p === "thismonth" || p === "month") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    match.$gte = start;
    match.$lte = end;
  } else {
    if (isValidDateStr(startDate)) {
      const start = new Date(startDate!);
      start.setHours(0, 0, 0, 0);
      match.$gte = start;
    }
    if (isValidDateStr(endDate)) {
      const end = new Date(endDate!);
      end.setHours(23, 59, 59, 999);
      match.$lte = end;
    }
  }

  return Object.keys(match).length > 0 ? { createdAt: match } : {};
};

export const getSalesRevenueReport = async (
  restaurantId: string,
  filtersOrBranchId?: SalesReportFilter | string,
  searchLegacy?: string,
  datesLegacy?: DateFilter
) => {
  let branchId: string | undefined;
  let preset: string | undefined;
  let startDate: string | undefined;
  let endDate: string | undefined;
  let searchQuery: string | undefined;
  let paymentMethod: string | undefined;
  let orderType: string | undefined;
  let page = 1;
  let limit = 10;

  if (typeof filtersOrBranchId === "object" && filtersOrBranchId !== null) {
    branchId = filtersOrBranchId.branchId;
    preset = filtersOrBranchId.preset;
    startDate = filtersOrBranchId.startDate;
    endDate = filtersOrBranchId.endDate;
    searchQuery = filtersOrBranchId.searchQuery || filtersOrBranchId.search;
    paymentMethod = filtersOrBranchId.paymentMethod;
    orderType = filtersOrBranchId.orderType;
    page = filtersOrBranchId.page !== undefined ? Number(filtersOrBranchId.page) : 1;
    limit = filtersOrBranchId.limit !== undefined ? Number(filtersOrBranchId.limit) : 10;
  } else {
    branchId = filtersOrBranchId;
    searchQuery = searchLegacy;
    startDate = datesLegacy?.startDate;
    endDate = datesLegacy?.endDate;
  }

  const dateMatch = buildSalesDateMatch(preset, startDate, endDate);
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

  if (paymentMethod && paymentMethod.toLowerCase() !== "all" && paymentMethod.toLowerCase() !== "all payment methods") {
    match.paymentMethod = new RegExp(`^${paymentMethod.trim()}$`, "i");
  }

  // Fetch orders matching base filters
  let orders = await Order.find(match)
    .populate("tableId", "tableNumber section")
    .sort({ createdAt: -1 })
    .lean();

  // Fetch billing records for bill & invoice matching
  const billings = await Billing.find({ restaurantId: restObjId, isDelete: false }).lean();
  const billingMap = new Map<string, any>();
  billings.forEach((b: any) => {
    if (b.orderId) billingMap.set(b.orderId.toString(), b);
    if (b.orderRefId) billingMap.set(b.orderRefId, b);
  });

  // Filter by search query if provided
  if (searchQuery && searchQuery.trim() !== "") {
    const s = searchQuery.toLowerCase().trim();
    orders = orders.filter((o: any) => {
      const orderIdStr = (o.orderId || "").toLowerCase();
      const pMethodStr = (o.paymentMethod || "").toLowerCase();
      const tableNum = (o.tableId?.tableNumber || "").toLowerCase();
      const bill = billingMap.get(o._id.toString()) || billingMap.get(o.orderId);
      const invoiceIdStr = (bill?.invoiceId || "").toLowerCase();
      const orderRefIdStr = (bill?.orderRefId || "").toLowerCase();

      return (
        orderIdStr.includes(s) ||
        pMethodStr.includes(s) ||
        tableNum.includes(s) ||
        invoiceIdStr.includes(s) ||
        orderRefIdStr.includes(s)
      );
    });
  }

  // Filter by order type if specified
  if (orderType && orderType.toLowerCase() !== "all" && orderType.toLowerCase() !== "all order types") {
    const ot = orderType.toLowerCase().trim();
    orders = orders.filter((o: any) => {
      const orderTypeVal = (o.orderType || (o.tableId ? "dine-in" : "takeaway")).toLowerCase();
      return orderTypeVal.includes(ot);
    });
  }

  // Calculate metrics matching UI summary cards
  let grossRevenue = 0;       // GROSS REVENUE
  let netSales = 0;           // NET SALES (EXCL. TAX)
  let totalDiscount = 0;      // TOTAL DISCOUNT
  let totalTax = 0;           // GST / TAX COLLECTED

  orders.forEach((o: any) => {
    const sub = o.subtotal || 0;
    const disc = o.discount || 0;
    const tx = o.tax || 0;
    const tot = o.total || 0;

    grossRevenue += tot;
    netSales += Math.max(0, sub - disc);
    totalDiscount += disc;
    totalTax += tx;
  });

  const totalRecords = orders.length;
  const avgOrderValue = totalRecords > 0 ? parseFloat((grossRevenue / totalRecords).toFixed(2)) : 0;

  const summary = {
    grossRevenue: parseFloat(grossRevenue.toFixed(2)),
    netSales: parseFloat(netSales.toFixed(2)),
    totalDiscount: parseFloat(totalDiscount.toFixed(2)),
    taxCollected: parseFloat(totalTax.toFixed(2)),
    avgOrderValue
  };

  // Pagination calculation
  const startIndex = (page - 1) * limit;
  const paginatedOrders = limit === 0 ? orders : orders.slice(startIndex, startIndex + limit);

  // Format data table records
  const results = paginatedOrders.map((o: any, idx: number) => {
    const bill = billingMap.get(o._id.toString()) || billingMap.get(o.orderId);
    const cleanOrderId = (o.orderId || "").replace(/^#/, "");
    const orderNo = o.orderId ? (o.orderId.startsWith("#") ? o.orderId : `#${o.orderId}`) : `#ORD-${o._id.toString().slice(-6)}`;
    const billNo = bill?.invoiceId ? `BILL-${bill.invoiceId}` : `BILL-ORD-${cleanOrderId}`;
    const invoiceNo = bill?.invoiceId || "-";
    const tableOrType = o.tableId?.tableNumber ? `Dine-In` : (o.orderType || "Dine-In");

    // Format Date & Time: "08/09/2026, 10:05 AM"
    const dateObj = new Date(o.createdAt);
    const formattedDate = dateObj.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }) + ", " + dateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });

    return {
      sNo: startIndex + idx + 1,
      id: o._id,
      dateTime: formattedDate,
      orderNo,
      billNo,
      invoiceNo,
      tableOrType,
      paymentMethod: o.paymentMethod || "upi",
      grossAmount: o.total || 0,
      discount: o.discount || 0,
      tax: o.tax || 0,
      createdAt: o.createdAt
    };
  });

  return {
    summary,
    totalRecords,
    totalPages: limit === 0 ? 1 : Math.ceil(totalRecords / limit),
    currentPage: page,
    limit,
    data: results,
    // Keep backwards compatibility keys
    results
  };
};

export interface DishPerformanceFilter {
  branchId?: string;
  preset?: string; // 'today' | 'yesterday' | 'last7days' | 'thisMonth' | 'allTime' | 'custom'
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  search?: string;
  orderType?: string; // 'all' | 'dine_in' | 'takeaway' | 'delivery'
  categoryId?: string;
  category?: string;
  dishId?: string;
  menuId?: string;
  dish?: string;
  foodType?: string; // 'all' | 'veg' | 'non-veg' | 'egg'
  page?: number;
  limit?: number;
}

export const getDishPerformanceReport = async (
  restaurantId: string,
  filtersOrBranchId?: DishPerformanceFilter | string,
  categoryIdLegacy?: string,
  searchLegacy?: string,
  datesLegacy?: DateFilter
) => {
  let branchId: string | undefined;
  let preset: string | undefined;
  let startDate: string | undefined;
  let endDate: string | undefined;
  let searchQuery: string | undefined;
  let orderType: string | undefined;
  let categoryId: string | undefined;
  let dishId: string | undefined;
  let foodType: string | undefined;
  let page = 1;
  let limit = 10;

  if (typeof filtersOrBranchId === "object" && filtersOrBranchId !== null) {
    branchId = filtersOrBranchId.branchId;
    preset = filtersOrBranchId.preset;
    startDate = filtersOrBranchId.startDate;
    endDate = filtersOrBranchId.endDate;
    searchQuery = filtersOrBranchId.searchQuery || filtersOrBranchId.search;
    orderType = filtersOrBranchId.orderType;
    categoryId = filtersOrBranchId.categoryId || filtersOrBranchId.category;
    dishId = filtersOrBranchId.dishId || filtersOrBranchId.menuId || filtersOrBranchId.dish;
    foodType = filtersOrBranchId.foodType;
    page = filtersOrBranchId.page !== undefined ? Number(filtersOrBranchId.page) : 1;
    limit = filtersOrBranchId.limit !== undefined ? Number(filtersOrBranchId.limit) : 10;
  } else {
    branchId = filtersOrBranchId;
    categoryId = categoryIdLegacy;
    searchQuery = searchLegacy;
    startDate = datesLegacy?.startDate;
    endDate = datesLegacy?.endDate;
  }

  const dateMatch = buildSalesDateMatch(preset, startDate, endDate);
  const restObjId = new mongoose.Types.ObjectId(restaurantId);

  const matchOrder: any = {
    restaurantId: restObjId,
    isDelete: false,
    status: { $ne: "cancelled" },
    ...dateMatch
  };

  if (branchId && branchId.toLowerCase() !== "all" && mongoose.Types.ObjectId.isValid(branchId)) {
    matchOrder.branchId = new mongoose.Types.ObjectId(branchId);
  }

  // Build Aggregation Pipeline
  const pipeline: any[] = [
    { $match: matchOrder },
    { $unwind: "$items" }
  ];

  // Lookup Menu details
  pipeline.push({
    $lookup: {
      from: "menus",
      localField: "items.menuId",
      foreignField: "_id",
      as: "menuDetails"
    }
  });
  pipeline.push({
    $unwind: { path: "$menuDetails", preserveNullAndEmptyArrays: true }
  });

  // Lookup Category details
  pipeline.push({
    $lookup: {
      from: "categories",
      localField: "menuDetails.category",
      foreignField: "_id",
      as: "categoryDetails"
    }
  });
  pipeline.push({
    $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true }
  });

  // Filter by category if specified
  if (categoryId && categoryId.toLowerCase() !== "all" && categoryId.toLowerCase() !== "all categories") {
    if (mongoose.Types.ObjectId.isValid(categoryId)) {
      pipeline.push({ $match: { "menuDetails.category": new mongoose.Types.ObjectId(categoryId) } });
    } else {
      pipeline.push({ $match: { "categoryDetails.name": new RegExp(categoryId, "i") } });
    }
  }

  // Filter by specific dish if specified
  if (dishId && dishId.toLowerCase() !== "all" && dishId.toLowerCase() !== "all dishes") {
    if (mongoose.Types.ObjectId.isValid(dishId)) {
      pipeline.push({ $match: { "items.menuId": new mongoose.Types.ObjectId(dishId) } });
    } else {
      pipeline.push({ $match: { "items.name": new RegExp(dishId, "i") } });
    }
  }

  // Filter by food type if specified ('veg', 'non-veg', 'egg')
  if (foodType && foodType.toLowerCase() !== "all" && foodType.toLowerCase() !== "all food types") {
    const ft = foodType.toLowerCase();
    if (ft.includes("non")) {
      pipeline.push({ $match: { "menuDetails.veg": false } });
    } else if (ft.includes("veg")) {
      pipeline.push({ $match: { "menuDetails.veg": true } });
    }
  }

  // Filter by search query if specified
  if (searchQuery && searchQuery.trim() !== "") {
    const s = searchQuery.trim();
    pipeline.push({
      $match: {
        $or: [
          { "items.name": new RegExp(s, "i") },
          { "categoryDetails.name": new RegExp(s, "i") }
        ]
      }
    });
  }

  // Group by Dish
  pipeline.push({
    $group: {
      _id: "$items.menuId",
      dishName: { $first: "$items.name" },
      category: { $first: "$categoryDetails.name" },
      veg: { $first: "$menuDetails.veg" },
      quantitySold: { $sum: "$items.qty" },
      grossSales: { $sum: { $multiply: ["$items.qty", "$items.price"] } },
      discount: { $sum: 0 }
    }
  });

  // Sort by quantity sold descending
  pipeline.push({ $sort: { quantitySold: -1, grossSales: -1 } });

  const aggregateResults = await Order.aggregate(pipeline);

  // Compute Summary Metrics
  let totalQuantitySold = 0;
  let totalNetSales = 0;
  let topSellingDish = "N/A";
  let maxQty = 0;

  aggregateResults.forEach((item: any) => {
    const net = Math.max(0, item.grossSales - (item.discount || 0));
    totalQuantitySold += item.quantitySold || 0;
    totalNetSales += net;

    if (item.quantitySold > maxQty) {
      maxQty = item.quantitySold;
      topSellingDish = item.dishName;
    }
  });

  const numberOfDishesSold = aggregateResults.length;

  const summary = {
    totalQuantitySold,
    totalNetSales: parseFloat(totalNetSales.toFixed(2)),
    topSellingDish,
    numberOfDishesSold
  };

  // Pagination calculation
  const totalRecords = aggregateResults.length;
  const startIndex = (page - 1) * limit;
  const paginatedList = limit === 0 ? aggregateResults : aggregateResults.slice(startIndex, startIndex + limit);

  // Format table data
  const data = paginatedList.map((item: any, idx: number) => {
    const netSales = Math.max(0, item.grossSales - (item.discount || 0));
    const salesPercentage = totalNetSales > 0 ? ((netSales / totalNetSales) * 100).toFixed(1) + "%" : "0.0%";

    let foodTypeLabel = "Veg";
    if (item.veg === false) {
      foodTypeLabel = "Non-Veg";
    }

    return {
      sNo: startIndex + idx + 1,
      menuId: item._id,
      dishName: item.dishName || "Unknown Dish",
      category: item.category || "General",
      foodType: foodTypeLabel,
      quantitySold: item.quantitySold || 0,
      grossSales: parseFloat((item.grossSales || 0).toFixed(2)),
      discount: parseFloat((item.discount || 0).toFixed(2)),
      netSales: parseFloat(netSales.toFixed(2)),
      salesPercentage
    };
  });

  return {
    summary,
    totalRecords,
    totalPages: limit === 0 ? 1 : Math.ceil(totalRecords / limit),
    currentPage: page,
    limit,
    data,
    results: data
  };
};

export interface OrderAnalyticsFilter {
  branchId?: string;
  preset?: string; // 'today' | 'yesterday' | 'last7days' | 'thisMonth' | 'allTime' | 'custom'
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  search?: string;
  orderType?: string; // 'all' | 'dine_in' | 'takeaway' | 'delivery'
  orderStatus?: string; // 'all' | 'completed' | 'pending' | 'in_progress' | 'cancelled'
  status?: string;
  page?: number;
  limit?: number;
}

export const getOrderAnalyticsReport = async (
  restaurantId: string,
  filtersOrBranchId?: OrderAnalyticsFilter | string,
  searchLegacy?: string,
  datesLegacy?: DateFilter
) => {
  let branchId: string | undefined;
  let preset: string | undefined;
  let startDate: string | undefined;
  let endDate: string | undefined;
  let searchQuery: string | undefined;
  let orderType: string | undefined;
  let orderStatus: string | undefined;
  let page = 1;
  let limit = 10;

  if (typeof filtersOrBranchId === "object" && filtersOrBranchId !== null) {
    branchId = filtersOrBranchId.branchId;
    preset = filtersOrBranchId.preset;
    startDate = filtersOrBranchId.startDate;
    endDate = filtersOrBranchId.endDate;
    searchQuery = filtersOrBranchId.searchQuery || filtersOrBranchId.search;
    orderType = filtersOrBranchId.orderType;
    orderStatus = filtersOrBranchId.orderStatus || filtersOrBranchId.status;
    page = filtersOrBranchId.page !== undefined ? Number(filtersOrBranchId.page) : 1;
    limit = filtersOrBranchId.limit !== undefined ? Number(filtersOrBranchId.limit) : 10;
  } else {
    branchId = filtersOrBranchId;
    searchQuery = searchLegacy;
    startDate = datesLegacy?.startDate;
    endDate = datesLegacy?.endDate;
  }

  const dateMatch = buildSalesDateMatch(preset, startDate, endDate);
  const restObjId = new mongoose.Types.ObjectId(restaurantId);

  const match: any = {
    restaurantId: restObjId,
    isDelete: false,
    ...dateMatch
  };

  if (branchId && branchId.toLowerCase() !== "all" && mongoose.Types.ObjectId.isValid(branchId)) {
    match.branchId = new mongoose.Types.ObjectId(branchId);
  }

  // Fetch orders matching base filters
  let orders = await Order.find(match)
    .populate("tableId", "tableNumber section")
    .populate("waiterId", "name email phone")
    .sort({ createdAt: -1 })
    .lean();

  // Filter by search query if provided
  if (searchQuery && searchQuery.trim() !== "") {
    const s = searchQuery.toLowerCase().trim();
    orders = orders.filter((o: any) => {
      const orderIdStr = (o.orderId || "").toLowerCase();
      const pMethodStr = (o.paymentMethod || "").toLowerCase();
      const statusStr = (o.status || "").toLowerCase();
      const tableNum = (o.tableId?.tableNumber || "").toLowerCase();
      const waiterName = (o.waiterId?.name || "").toLowerCase();

      return (
        orderIdStr.includes(s) ||
        pMethodStr.includes(s) ||
        statusStr.includes(s) ||
        tableNum.includes(s) ||
        waiterName.includes(s)
      );
    });
  }

  // Filter by order type if specified
  if (orderType && orderType.toLowerCase() !== "all" && orderType.toLowerCase() !== "all order types") {
    const ot = orderType.toLowerCase().trim();
    orders = orders.filter((o: any) => {
      const orderTypeVal = (o.orderType || (o.tableId ? "dine-in" : "takeaway")).toLowerCase();
      return orderTypeVal.includes(ot);
    });
  }

  // Filter by order status if specified
  if (orderStatus && orderStatus.toLowerCase() !== "all" && orderStatus.toLowerCase() !== "all statuses") {
    const st = orderStatus.toLowerCase().trim();
    orders = orders.filter((o: any) => {
      const statusVal = (o.status || "").toLowerCase();
      if (st === "pending" || st === "in_progress" || st === "pending / in-progress") {
        return ["new", "preparing", "ready", "in-progress"].includes(statusVal);
      }
      return statusVal === st;
    });
  }

  // Calculate exact summary metrics (6 Cards)
  const totalOrders = orders.length;
  let completedOrders = 0;
  let pendingOrders = 0;
  let cancelledOrders = 0;
  let dineInOrders = 0;
  let takeawayDeliveryOrders = 0;

  orders.forEach((o: any) => {
    const statusVal = (o.status || "").toLowerCase();
    const typeVal = (o.orderType || (o.tableId ? "dine-in" : "takeaway")).toLowerCase();

    if (["completed", "served", "done"].includes(statusVal)) {
      completedOrders++;
    } else if (statusVal === "cancelled") {
      cancelledOrders++;
    } else {
      pendingOrders++;
    }

    if (typeVal.includes("dine")) {
      dineInOrders++;
    } else {
      takeawayDeliveryOrders++;
    }
  });

  const summary = {
    totalOrders,
    completedOrders,
    pendingOrders,
    cancelledOrders,
    dineInOrders,
    takeawayDeliveryOrders
  };

  // Pagination calculation
  const totalRecords = orders.length;
  const startIndex = (page - 1) * limit;
  const paginatedOrders = limit === 0 ? orders : orders.slice(startIndex, startIndex + limit);

  // Format table rows
  const data = paginatedOrders.map((o: any, idx: number) => {
    const orderNo = o.orderId ? (o.orderId.startsWith("#") ? o.orderId : `#${o.orderId}`) : `#ORD-${o._id.toString().slice(-6)}`;
    const tableStr = o.tableId?.tableNumber ? `Table ${o.tableId.tableNumber}` : "N/A";
    const itemsCount = (o.items || []).length;
    const isPaid = o.billingStatus === "paid" || ["completed", "served"].includes(o.status);

    // Date Format: "26/08/2026, 04:10 PM"
    const dateObj = new Date(o.createdAt);
    const formattedDate = dateObj.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }) + ", " + dateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });

    let formattedStatus = "Pending";
    if (o.status === "completed" || o.status === "served") formattedStatus = "Completed";
    else if (o.status === "preparing") formattedStatus = "Preparing";
    else if (o.status === "ready") formattedStatus = "Ready";
    else if (o.status === "cancelled") formattedStatus = "Cancelled";

    return {
      sNo: startIndex + idx + 1,
      id: o._id,
      orderNo,
      dateTime: formattedDate,
      orderType: o.orderType || (o.tableId ? "Dine-In" : "Takeaway"),
      table: tableStr,
      itemsCount,
      amount: o.total || 0,
      paymentStatus: isPaid ? "Paid" : (o.status === "cancelled" ? "Refunded" : "Unpaid"),
      orderStatus: formattedStatus,
      staffResponsible: o.waiterId?.name || o.paymentMethod || "Staff",
      createdAt: o.createdAt
    };
  });

  return {
    summary,
    totalRecords,
    totalPages: limit === 0 ? 1 : Math.ceil(totalRecords / limit),
    currentPage: page,
    limit,
    data,
    results: data
  };
};

export interface InventoryStockFilter {
  branchId?: string;
  preset?: string; // 'today' | 'yesterday' | 'last7days' | 'thisMonth' | 'allTime' | 'custom'
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  search?: string;
  categoryId?: string;
  category?: string;
  itemId?: string;
  item?: string;
  stockStatus?: string; // 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
  transactionType?: string; // 'all' | 'purchase' | 'consumption' | 'reduction' | 'wastage'
  tab?: string; // 'position' | 'movement' | 'low_stock'
  page?: number;
  limit?: number;
}

export const getInventoryStockReport = async (
  restaurantId: string,
  filtersOrBranchId?: InventoryStockFilter | string,
  searchLegacy?: string
) => {
  let branchId: string | undefined;
  let preset: string | undefined;
  let startDate: string | undefined;
  let endDate: string | undefined;
  let searchQuery: string | undefined;
  let categoryId: string | undefined;
  let itemId: string | undefined;
  let stockStatus: string | undefined;
  let transactionType: string | undefined;
  let tab = "position";
  let page = 1;
  let limit = 10;

  if (typeof filtersOrBranchId === "object" && filtersOrBranchId !== null) {
    branchId = filtersOrBranchId.branchId;
    preset = filtersOrBranchId.preset;
    startDate = filtersOrBranchId.startDate;
    endDate = filtersOrBranchId.endDate;
    searchQuery = filtersOrBranchId.searchQuery || filtersOrBranchId.search;
    categoryId = filtersOrBranchId.categoryId || filtersOrBranchId.category;
    itemId = filtersOrBranchId.itemId || filtersOrBranchId.item;
    stockStatus = filtersOrBranchId.stockStatus;
    transactionType = filtersOrBranchId.transactionType;
    tab = filtersOrBranchId.tab || "position";
    page = filtersOrBranchId.page !== undefined ? Number(filtersOrBranchId.page) : 1;
    limit = filtersOrBranchId.limit !== undefined ? Number(filtersOrBranchId.limit) : 10;
  } else {
    branchId = filtersOrBranchId;
    searchQuery = searchLegacy;
  }

  const restObjId = new mongoose.Types.ObjectId(restaurantId);
  const match: any = {
    restaurantId: restObjId,
    isDelete: false
  };

  if (branchId && branchId.toLowerCase() !== "all" && mongoose.Types.ObjectId.isValid(branchId)) {
    match.branchId = new mongoose.Types.ObjectId(branchId);
  }

  if (categoryId && categoryId.toLowerCase() !== "all" && categoryId.toLowerCase() !== "all categories") {
    if (mongoose.Types.ObjectId.isValid(categoryId)) {
      match.categoryId = new mongoose.Types.ObjectId(categoryId);
    } else {
      match.category = new RegExp(categoryId, "i");
    }
  }

  if (itemId && itemId.toLowerCase() !== "all" && itemId.toLowerCase() !== "all items") {
    if (mongoose.Types.ObjectId.isValid(itemId)) {
      match._id = new mongoose.Types.ObjectId(itemId);
    } else {
      match.name = new RegExp(itemId, "i");
    }
  }

  // Fetch inventory items
  let items = await InventoryItem.find(match)
    .populate("categoryId", "name categoryName")
    .sort({ name: 1 })
    .lean();

  // Search filter
  if (searchQuery && searchQuery.trim() !== "") {
    const s = searchQuery.toLowerCase().trim();
    items = items.filter((item: any) => {
      const nameStr = (item.name || "").toLowerCase();
      const catStr = (item.category || item.categoryId?.categoryName || item.categoryId?.name || "").toLowerCase();
      const skuStr = (item.sku || item.itemCode || "").toLowerCase();
      return nameStr.includes(s) || catStr.includes(s) || skuStr.includes(s);
    });
  }

  // Fetch purchases and reductions for stock calculations
  const purchases = await InventoryPurchase.find({ restaurantId: restObjId, isDelete: false }).lean();
  const reductions = await InventoryReduction.find({ restaurantId: restObjId, isDelete: false }).lean();

  const purchaseMap = new Map<string, number>();
  purchases.forEach((p: any) => {
    if (p.itemId) {
      const key = p.itemId.toString();
      purchaseMap.set(key, (purchaseMap.get(key) || 0) + (p.purchaseQty || 0));
    }
  });

  const consumedMap = new Map<string, number>();
  const wastageMap = new Map<string, number>();
  reductions.forEach((r: any) => {
    if (r.itemId) {
      const key = r.itemId.toString();
      const reason = (r.reason || "").toLowerCase();
      const qty = r.quantityToReduce || 0;
      if (reason.includes("spoilage") || reason.includes("waste") || reason.includes("damage")) {
        wastageMap.set(key, (wastageMap.get(key) || 0) + qty);
      } else {
        consumedMap.set(key, (consumedMap.get(key) || 0) + qty);
      }
    }
  });

  // Calculate Summary Cards & Rows
  let totalInventoryItems = items.length;
  let lowStockItems = 0;
  let outOfStockItems = 0;
  let totalStockValue = 0;

  let totalOpeningStock = 0;
  let totalPurchasedAdded = 0;
  let totalUsedConsumed = 0;
  let totalWastage = 0;
  let totalClosingStock = 0;

  let formattedRows = items.map((item: any) => {
    const currentStock = item.currentStock || 0;
    const minAlert = item.minAlertLevel || 0;
    const costPerUnit = item.costPerUnit || 0;
    const itemValue = currentStock * costPerUnit;

    const isOut = currentStock <= 0;
    const isLow = currentStock <= minAlert && currentStock > 0;

    if (isOut) outOfStockItems++;
    else if (isLow) lowStockItems++;

    totalStockValue += itemValue;

    const itemKey = item._id.toString();
    const purchasedAdded = purchaseMap.get(itemKey) || 0;
    const usedConsumed = consumedMap.get(itemKey) || 0;
    const wastage = wastageMap.get(itemKey) || 0;
    const openingStock = Math.max(0, currentStock + usedConsumed + wastage - purchasedAdded);

    totalOpeningStock += openingStock;
    totalPurchasedAdded += purchasedAdded;
    totalUsedConsumed += usedConsumed;
    totalWastage += wastage;
    totalClosingStock += currentStock;

    let statusText = "In Stock";
    if (isOut) statusText = "Out of Stock";
    else if (isLow) statusText = "Low Stock";

    return {
      id: item._id,
      itemId: item._id,
      itemName: item.name || "Unknown Item",
      category: item.categoryId?.categoryName || item.categoryId?.name || item.category || "General",
      unit: item.unit || "kg",
      openingStock,
      purchasedAdded: `+${purchasedAdded}`,
      addedQuantity: purchasedAdded,
      usedConsumed: `-${usedConsumed}`,
      consumedQuantity: usedConsumed,
      wastage,
      closingStock: currentStock,
      currentStock,
      minAlertLevel: minAlert,
      costPerUnit,
      totalValue: itemValue,
      status: statusText
    };
  });

  // Filter by stock status if specified
  if (stockStatus && stockStatus.toLowerCase() !== "all" && stockStatus.toLowerCase() !== "all stock status") {
    const st = stockStatus.toLowerCase().trim();
    formattedRows = formattedRows.filter((r) => {
      const statusVal = r.status.toLowerCase();
      if (st.includes("low")) return statusVal.includes("low");
      if (st.includes("out")) return statusVal.includes("out");
      if (st.includes("in")) return statusVal === "in stock";
      return true;
    });
  }

  // Filter by Tab (e.g. low_stock tab)
  if (tab === "low_stock" || tab === "lowStock") {
    formattedRows = formattedRows.filter((r) => r.status === "Low Stock" || r.status === "Out of Stock");
  }

  const summary = {
    totalInventoryItems,
    lowStockItems,
    outOfStockItems,
    totalStockValue: parseFloat(totalStockValue.toFixed(2))
  };

  const tableSummary = {
    totalOpeningStock,
    totalPurchasedAdded: `+${totalPurchasedAdded}`,
    totalUsedConsumed: `-${totalUsedConsumed}`,
    totalWastage,
    totalClosingStock
  };

  // Pagination calculation
  const totalRecords = formattedRows.length;
  const startIndex = (page - 1) * limit;
  const paginatedRows = limit === 0 ? formattedRows : formattedRows.slice(startIndex, startIndex + limit);

  const data = paginatedRows.map((r, idx) => ({
    sNo: startIndex + idx + 1,
    ...r
  }));

  return {
    summary,
    tableSummary,
    totalRecords,
    totalPages: limit === 0 ? 1 : Math.ceil(totalRecords / limit),
    currentPage: page,
    limit,
    data,
    results: data
  };
};

export interface StaffPerformanceFilter {
  branchId?: string;
  preset?: string; // 'today' | 'yesterday' | 'last7days' | 'thisMonth' | 'allTime' | 'custom'
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  search?: string;
  staffId?: string;
  waiterId?: string;
  staff?: string;
  roleId?: string;
  role?: string;
  page?: number;
  limit?: number;
}

export const getStaffPerformanceReport = async (
  restaurantId: string,
  filtersOrBranchId?: StaffPerformanceFilter | string,
  searchLegacy?: string,
  datesLegacy?: DateFilter
) => {
  let branchId: string | undefined;
  let preset: string | undefined;
  let startDate: string | undefined;
  let endDate: string | undefined;
  let searchQuery: string | undefined;
  let staffId: string | undefined;
  let roleId: string | undefined;
  let page = 1;
  let limit = 10;

  if (typeof filtersOrBranchId === "object" && filtersOrBranchId !== null) {
    branchId = filtersOrBranchId.branchId;
    preset = filtersOrBranchId.preset;
    startDate = filtersOrBranchId.startDate;
    endDate = filtersOrBranchId.endDate;
    searchQuery = filtersOrBranchId.searchQuery || filtersOrBranchId.search;
    staffId = filtersOrBranchId.staffId || filtersOrBranchId.waiterId || filtersOrBranchId.staff;
    roleId = filtersOrBranchId.roleId || filtersOrBranchId.role;
    page = filtersOrBranchId.page !== undefined ? Number(filtersOrBranchId.page) : 1;
    limit = filtersOrBranchId.limit !== undefined ? Number(filtersOrBranchId.limit) : 10;
  } else {
    branchId = filtersOrBranchId;
    searchQuery = searchLegacy;
    startDate = datesLegacy?.startDate;
    endDate = datesLegacy?.endDate;
  }

  const dateMatch = buildSalesDateMatch(preset, startDate, endDate);
  const restObjId = new mongoose.Types.ObjectId(restaurantId);

  // 1. Fetch Staff Users
  const userQuery: any = {
    restaurantId: restObjId,
    isDelete: false
  };

  if (branchId && branchId.toLowerCase() !== "all" && mongoose.Types.ObjectId.isValid(branchId)) {
    userQuery.branchId = new mongoose.Types.ObjectId(branchId);
  }

  if (staffId && staffId.toLowerCase() !== "all" && staffId.toLowerCase() !== "all staff" && mongoose.Types.ObjectId.isValid(staffId)) {
    userQuery._id = new mongoose.Types.ObjectId(staffId);
  }

  const staffUsers = await User.find(userQuery).populate("roleId", "roleName code").lean();

  // 2. Aggregate Orders for staff
  const orderMatch: any = {
    restaurantId: restObjId,
    isDelete: false,
    ...dateMatch
  };

  if (branchId && branchId.toLowerCase() !== "all" && mongoose.Types.ObjectId.isValid(branchId)) {
    orderMatch.branchId = new mongoose.Types.ObjectId(branchId);
  }

  const orders = await Order.find(orderMatch).lean();

  // Maps to track stats per staff ID
  const staffStats = new Map<string, {
    ordersHandled: number;
    kotsHandled: number;
    billsGenerated: number;
    paymentsCollected: number;
    salesAmount: number;
    cancelledOrders: number;
  }>();

  orders.forEach((o: any) => {
    if (!o.waiterId) return;
    const wId = o.waiterId.toString();
    if (!staffStats.has(wId)) {
      staffStats.set(wId, {
        ordersHandled: 0,
        kotsHandled: 0,
        billsGenerated: 0,
        paymentsCollected: 0,
        salesAmount: 0,
        cancelledOrders: 0
      });
    }

    const stat = staffStats.get(wId)!;
    if (o.status === "cancelled") {
      stat.cancelledOrders += 1;
    } else {
      stat.ordersHandled += 1;
      stat.kotsHandled += 1;
      stat.salesAmount += o.total || 0;
      if (o.billingStatus === "paid" || ["completed", "served"].includes(o.status)) {
        stat.billsGenerated += 1;
        stat.paymentsCollected += 1;
      }
    }
  });

  // Map staff users to formatted table rows
  let formattedRows = staffUsers.map((u: any, idx: number) => {
    const uIdStr = u._id.toString();
    const stat = staffStats.get(uIdStr) || {
      ordersHandled: 0,
      kotsHandled: 0,
      billsGenerated: 0,
      paymentsCollected: 0,
      salesAmount: 0,
      cancelledOrders: 0
    };

    const staffCode = u.employeeId || u.empId || `EMP-${String(idx + 1).padStart(3, "0")}`;
    const roleName = u.roleId?.roleName || u.role || "Staff";

    return {
      id: u._id,
      staffId: staffCode,
      staffName: u.name || "Unknown Staff",
      name: u.name || "Unknown Staff",
      role: roleName,
      ordersHandled: stat.ordersHandled,
      kotsHandled: stat.kotsHandled,
      billsGenerated: stat.billsGenerated,
      paymentsCollected: stat.paymentsCollected,
      salesAmount: parseFloat(stat.salesAmount.toFixed(2)),
      cancelledOrders: stat.cancelledOrders,
      status: u.dutyStatus === "ON_DUTY" ? "On Duty" : "Off Duty"
    };
  });

  // Include staff found in orders but not in User model
  for (const [wId, stat] of staffStats.entries()) {
    if (!staffUsers.some(u => u._id.toString() === wId)) {
      formattedRows.push({
        id: wId,
        staffId: `EMP-${wId.slice(-3).toUpperCase()}`,
        staffName: `Staff #${wId.slice(-4)}`,
        name: `Staff #${wId.slice(-4)}`,
        role: "Staff",
        ordersHandled: stat.ordersHandled,
        kotsHandled: stat.kotsHandled,
        billsGenerated: stat.billsGenerated,
        paymentsCollected: stat.paymentsCollected,
        salesAmount: parseFloat(stat.salesAmount.toFixed(2)),
        cancelledOrders: stat.cancelledOrders,
        status: "On Duty"
      });
    }
  }

  // Filter by Role if specified
  if (roleId && roleId.toLowerCase() !== "all" && roleId.toLowerCase() !== "all roles") {
    const rStr = roleId.toLowerCase();
    formattedRows = formattedRows.filter(r => r.role.toLowerCase().includes(rStr));
  }

  // Filter by Search Query
  if (searchQuery && searchQuery.trim() !== "") {
    const s = searchQuery.toLowerCase().trim();
    formattedRows = formattedRows.filter(r =>
      r.staffName.toLowerCase().includes(s) ||
      r.staffId.toLowerCase().includes(s) ||
      r.role.toLowerCase().includes(s)
    );
  }

  // Compute Overall Summary Cards
  const activeStaff = formattedRows.length;
  let totalOrdersHandled = 0;
  let totalKotsHandled = 0;
  let totalBillsGenerated = 0;
  let totalPaymentsCollected = 0;
  let totalSalesAmount = 0;
  let totalCancelledOrders = 0;

  formattedRows.forEach(r => {
    totalOrdersHandled += r.ordersHandled;
    totalKotsHandled += r.kotsHandled;
    totalBillsGenerated += r.billsGenerated;
    totalPaymentsCollected += r.paymentsCollected;
    totalSalesAmount += r.salesAmount;
    totalCancelledOrders += r.cancelledOrders;
  });

  const summary = {
    activeStaff,
    ordersHandled: totalOrdersHandled,
    billsGenerated: totalBillsGenerated,
    salesAmount: parseFloat(totalSalesAmount.toFixed(2))
  };

  const tableSummary = {
    totalOrdersHandled,
    totalKotsHandled,
    totalBillsGenerated,
    totalPaymentsCollected,
    totalSalesAmount: parseFloat(totalSalesAmount.toFixed(2)),
    totalCancelledOrders
  };

  // Pagination calculation
  const totalRecords = formattedRows.length;
  const startIndex = (page - 1) * limit;
  const paginatedRows = limit === 0 ? formattedRows : formattedRows.slice(startIndex, startIndex + limit);

  const data = paginatedRows.map((r, idx) => ({
    sNo: startIndex + idx + 1,
    ...r
  }));

  return {
    summary,
    tableSummary,
    totalRecords,
    totalPages: limit === 0 ? 1 : Math.ceil(totalRecords / limit),
    currentPage: page,
    limit,
    data,
    results: data
  };
};


