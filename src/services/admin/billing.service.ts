import Order from "../../models/Order";
import Table from "../../models/Table";

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
  const order = await Order.findOne({ _id: orderId, restaurantId, branchId, isDelete: false });
  if (!order) throw new Error("Order not found");
  if (order.billingStatus === "paid") throw new Error("Order is already paid");

  order.billingStatus = "paid";
  order.paymentMethod = paymentMethod;
  await order.save();

  // Free the table
  await Table.updateOne(
    { _id: order.tableId, restaurantId, branchId },
    { status: "Available" }
  );

  return order;
};
