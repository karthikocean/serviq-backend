import Order from "../../models/Order";
import Table from "../../models/Table";
import Billing from "../../models/Billing";
import User from "../../models/User";

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


export const processPayment = async (restaurantId: string, branchId: string, orderId: string, paymentMethod: "cash" | "card" | "upi") => {
  const order = await Order.findOne({ _id: orderId, restaurantId, branchId, isDelete: false })
    .populate("tableId", "tableNumber");
  
  if (!order) throw new Error("Order not found");
  if (order.billingStatus === "paid") throw new Error("Order is already paid");

  order.billingStatus = "paid";
  order.paymentMethod = paymentMethod;
  await order.save();

  // Create Invoice/Billing Record
  let staffName = "Admin";
  if (order.waiterId) {
    const waiter = await User.findById(order.waiterId);
    if (waiter) staffName = waiter.name;
  }

  const tableNumber = (order.tableId as any)?.tableNumber || "N/A";
  
  // Generate sequential invoice ID
  const lastBilling = await Billing.findOne({ restaurantId }).sort({ createdAt: -1 });
  let nextInvoiceNumber = 10001; // Starting number if no invoices exist

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
    orderId: order._id,
    orderRefId: order.orderId,
    invoiceId,
    tableNumber,
    subtotal: order.subtotal,
    tax: order.tax,
    discount: order.discount,
    charge: order.charge,
    totalAmount: order.total,
    paymentMethod,
    paymentStatus: "Paid",
    staffName,
    items: order.items.map(item => ({
      name: item.name,
      qty: item.qty,
      price: item.price,
      total: item.qty * item.price
    }))
  });

  await billingRecord.save();

  // Free the table
  await Table.updateOne(
    { _id: order.tableId, restaurantId, branchId },
    { status: "Available" }
  );

  return order;
};

export const getBillingHistory = async (restaurantId: string, branchId: string, filters: any) => {
  const query: any = { restaurantId, branchId, isDelete: false };

  if (filters.paymentMethod && filters.paymentMethod !== 'All Methods') {
    query.paymentMethod = filters.paymentMethod;
  }
  
  // If specific branch filter is provided, override branchId
  if (filters.branchId && filters.branchId !== 'All Branches' && filters.branchId !== 'all') {
    query.branchId = filters.branchId;
  }

  // NOTE: In production, add date range filtering here
  
  const history = await Billing.find(query).sort({ createdAt: -1 });
  return history;
};
