import Order from "../../models/Order";
import Table from "../../models/Table";
import Billing from "../../models/Billing";
import User from "../../models/User";
import mongoose from "mongoose";

export const getBillDetails = async (restaurantId: string, branchId: string, orderId: string) => {
  const order = await Order.findOne({ _id: orderId, restaurantId, branchId, isDelete: false })
    .populate("tableId", "tableNumber section")
    .populate("items.menuId", "name price gst");

  if (!order) throw new Error("Order not found");
  return order;
};

export const applyDiscount = async (restaurantId: string, branchId: string, orderId: string, discount: number) => {
  const order = await Order.findOne({ _id: orderId, restaurantId, branchId, isDelete: false, billingStatus: "unpaid" });
  if (!order) throw new Error("Order not found or already paid");

  // Recalculate total with discount
  const subtotal = order.subtotal;
  const tax = order.tax;
  const charge = order.charge;
  const newTotal = Math.max(0, subtotal + tax + charge - discount);

  order.discount = discount;
  order.total = newTotal;
  await order.save();

  return order;
};

export const processTablePayment = async (restaurantId: string, branchId: string, tableId: string, paymentMethod: "cash" | "card" | "upi") => {
  let createdBillingId = null;

  try {
    const orders = await Order.find({ tableId, restaurantId, branchId, isDelete: false, billingStatus: "unpaid" });
    
    if (!orders || orders.length === 0) {
      throw new Error("No unpaid orders found for this table.");
    }

    let subtotal = 0;
    let tax = 0;
    let discount = 0;
    let charge = 0;
    let totalAmount = 0;
    const items = [];
    const orderId = orders[0]._id;
    const orderRefId = orders[0].orderId;
    let staffName = "Admin";

    const tableDoc = await Table.findById(tableId);
    const tableNumber = tableDoc?.tableNumber || "N/A";

    // Recalculate and merge
    for (const order of orders) {
      subtotal += order.subtotal;
      tax += order.tax;
      discount += order.discount || 0;
      charge += order.charge || 0;
      totalAmount += order.total;

      for (const item of order.items) {
        items.push({
          name: item.name,
          qty: item.qty,
          price: item.price,
          total: item.qty * item.price
        });
      }

      if (order.waiterId) {
        const waiter = await User.findById(order.waiterId);
        if (waiter) staffName = waiter.name;
      }
    }

    // Double check the math just to be absolutely sure backend recalculation is solid
    const recalculatedTotal = Math.max(0, subtotal + tax + charge - discount);

    const lastBilling = await Billing.findOne({ restaurantId }).sort({ createdAt: -1 });
    let nextInvoiceNumber = 10001;

    if (lastBilling && lastBilling.invoiceId && lastBilling.invoiceId.startsWith("INV-")) {
      const lastNumber = parseInt(lastBilling.invoiceId.replace("INV-", ""), 10);
      if (!isNaN(lastNumber)) {
        nextInvoiceNumber = lastNumber + 1;
      }
    }
    const invoiceId = `INV-${nextInvoiceNumber}`;

    const billingRecord = new Billing({
      restaurantId,
      branchId,
      orderId,
      orderRefId,
      invoiceId,
      tableNumber,
      subtotal,
      tax,
      discount,
      charge,
      totalAmount: recalculatedTotal,
      paymentMethod,
      paymentStatus: "Paid",
      staffName,
      items
    });

    await billingRecord.save();
    createdBillingId = billingRecord._id; // Store ID for manual rollback if needed

    // Update all orders
    for (const order of orders) {
      order.billingStatus = "paid";
      order.paymentMethod = paymentMethod;
      order.status = "completed"; // Automatically complete the order when table is closed and paid
      await order.save();
    }

    // Free the table
    if (tableDoc) {
      tableDoc.status = "Available";
      await tableDoc.save();
    }

    return billingRecord;

  } catch (error) {
    console.error("Error in processTablePayment:", error);
    
    // Manual Rollback if Billing was created but subsequent operations failed
    if (createdBillingId) {
      await Billing.findByIdAndDelete(createdBillingId);
      console.log(`Rollback: Deleted Billing record ${createdBillingId} due to error.`);
    }
    
    throw error;
  }
};

export const getBillingHistory = async (restaurantId: string, branchId: string, filters: any) => {
  const query: any = { isDelete: false };

  if (mongoose.Types.ObjectId.isValid(restaurantId)) {
    query.restaurantId = new mongoose.Types.ObjectId(restaurantId);
  }

  if (branchId && branchId !== 'ALL' && mongoose.Types.ObjectId.isValid(branchId)) {
    query.branchId = new mongoose.Types.ObjectId(branchId);
  } else if (filters.branchId && mongoose.Types.ObjectId.isValid(filters.branchId)) {
    query.branchId = new mongoose.Types.ObjectId(filters.branchId);
  }

  if (filters.paymentMethod && !['all', 'all methods'].includes(filters.paymentMethod.toLowerCase())) {
    // Normalize to handle 'upi', 'cash', etc. case insensitively if needed
    query.paymentMethod = new RegExp(`^${filters.paymentMethod}$`, 'i');
  }

  if (filters.search) {
    query.$or = [
      { invoiceId: { $regex: filters.search, $options: 'i' } },
      { orderRefId: { $regex: filters.search, $options: 'i' } },
      { tableNumber: { $regex: filters.search, $options: 'i' } }
    ];
  }

  if (filters.startDate && filters.endDate) {
    const start = new Date(filters.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    query.createdAt = { $gte: start, $lte: end };
  } else if (filters.dateRange && filters.dateRange !== 'All') {
    const now = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    if (filters.dateRange === 'Today') {
      // Defaults to today as set above
    } else if (filters.dateRange === 'Yesterday') {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
    } else if (filters.dateRange === 'This Week') {
      start.setDate(now.getDate() - now.getDay()); // Sunday as start
    } else if (filters.dateRange === 'This Month') {
      start.setDate(1);
    }
    
    if (filters.dateRange !== 'All') {
      query.createdAt = { $gte: start, $lte: end };
    }
  }

  // Handle Export case (limit = 0 or no pagination)
  const isExport = filters.limit === '0' || filters.isExport === 'true';

  const page = parseInt(filters.page as string) || 1;
  const limit = parseInt(filters.limit as string) || 10;
  const skip = (page - 1) * limit;

  // Perform parallel queries for data and summary
  const [data, totalItems, summaryData] = await Promise.all([
    Billing.find(query)
      .sort({ createdAt: -1 })
      .skip(isExport ? 0 : skip)
      .limit(isExport ? 0 : limit),
    Billing.countDocuments(query),
    Billing.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount" },
          cashTotal: { 
            $sum: { 
              $cond: [{ $regexMatch: { input: { $ifNull: ["$paymentMethod", ""] }, regex: /^cash$/i } }, "$totalAmount", 0] 
            } 
          },
          upiTotal: { 
            $sum: { 
              $cond: [{ $regexMatch: { input: { $ifNull: ["$paymentMethod", ""] }, regex: /^upi$/i } }, "$totalAmount", 0] 
            } 
          },
          cardTotal: { 
            $sum: { 
              $cond: [{ $regexMatch: { input: { $ifNull: ["$paymentMethod", ""] }, regex: /^card$/i } }, "$totalAmount", 0] 
            } 
          }
        }
      }
    ])
  ]);

  const summary = summaryData[0] || { totalSales: 0, cashTotal: 0, upiTotal: 0, cardTotal: 0 };

  return {
    items: data,
    totalItems,
    page: isExport ? 1 : page,
    totalPages: isExport ? 1 : Math.ceil(totalItems / limit),
    summary
  };
};

export const getActiveTablesBilling = async (restaurantId: string, branchId: string) => {
  const orders = await Order.find({ restaurantId, branchId, isDelete: false, billingStatus: "unpaid" })
    .populate("tableId", "tableNumber section");

  return orders.map(order => {
    const table: any = order.tableId;
    if (!table) return null;

    const items = (order.items || []).map((item: any) => ({
      name: item.name,
      qty: item.qty,
      rate: item.price,
      amount: item.qty * item.price,
      notes: item.notes
    }));

    return {
      tableId: table._id.toString(),
      table: `Table ${table.tableNumber}`,
      orderId: order.orderId,
      status: "Unpaid",
      subtotal: order.subtotal || 0,
      tax: order.tax || 0,
      discount: order.discount || 0,
      total: order.total || 0,
      items: items
    };
  }).filter(Boolean);
};
