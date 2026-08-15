import Order from "../../models/Order";
import Table from "../../models/Table";

export const getOrders = async (restaurantId: string, branchId: string, status?: string) => {
  const query: any = { restaurantId, branchId, isDelete: false };
  if (status) query.status = status;

  return await Order.find(query)
    .populate("tableId", "tableNumber section")
    .populate("waiterId", "name phoneNumber")
    .populate("items.menuId", "name image veg category")
    .sort({ createdAt: -1 });
};

export const getOrderById = async (restaurantId: string, branchId: string, orderId: string) => {
  const order = await Order.findOne({ _id: orderId, restaurantId, branchId, isDelete: false })
    .populate("tableId", "tableNumber section")
    .populate("waiterId", "name phoneNumber")
    .populate("items.menuId", "name image veg category");
    
  if (!order) throw new Error("Order not found");
  return order;
};

export const createOrder = async (restaurantId: string, branchId: string, orderData: any) => {
  // Generate a unique order ID
  const orderId = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

  const newOrder = new Order({
    ...orderData,
    restaurantId,
    branchId,
    orderId,
    time: new Date().toISOString()
  });

  await newOrder.save();

  // If table was provided, update table status
  if (orderData.tableId) {
    await Table.updateOne(
      { _id: orderData.tableId, restaurantId, branchId },
      { status: "Occupied" }
    );
  }

  return newOrder;
};

export const updateOrderStatus = async (restaurantId: string, branchId: string, orderId: string, status: string) => {
  const order = await Order.findOne({ _id: orderId, restaurantId, branchId, isDelete: false });
  if (!order) throw new Error("Order not found");

  order.status = status as any;
  
  // If order is done, we don't automatically free table since they might still need to pay.
  // The table freeing will happen during billing process.
  await order.save();
  return order;
};

export const updateOrderItems = async (restaurantId: string, branchId: string, orderId: string, updateData: any) => {
  const order = await Order.findOne({ _id: orderId, restaurantId, branchId, isDelete: false });
  if (!order) throw new Error("Order not found");

  if (updateData.items) order.items = updateData.items;
  if (updateData.subtotal !== undefined) order.subtotal = updateData.subtotal;
  if (updateData.tax !== undefined) order.tax = updateData.tax;
  if (updateData.charge !== undefined) order.charge = updateData.charge;
  if (updateData.total !== undefined) order.total = updateData.total;

  await order.save();
  return order;
};

export const deleteOrder = async (restaurantId: string, branchId: string, orderId: string) => {
  const order = await Order.findOne({ _id: orderId, restaurantId, branchId, isDelete: false });
  if (!order) throw new Error("Order not found");

  order.isDelete = true;
  await order.save();

  // Free the table
  await Table.updateOne(
    { _id: order.tableId, restaurantId, branchId },
    { status: "Available" }
  );

  return true;
};
