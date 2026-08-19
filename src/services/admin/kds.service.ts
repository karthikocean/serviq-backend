import Order from "../../models/Order";

export const getActiveKdsOrders = async (restaurantId: string, branchId: string) => {
  return await Order.find({ 
    restaurantId, 
    branchId, 
    isDelete: false, 
    status: { $in: ["new", "preparing"] } 
  })
    .populate("tableId", "tableNumber section")
    .populate("items.menuId", "name image")
    .sort({ createdAt: 1 }); // Oldest first for KDS
};

export const updateKdsItemStatus = async (restaurantId: string, branchId: string, orderId: string, itemId: string, status: string) => {
  const order = await Order.findOne({ _id: orderId, restaurantId, branchId, isDelete: false });
  if (!order) throw new Error("Order not found");

  const item = order.items.find((i: any) => i._id.toString() === itemId);
  if (!item) throw new Error("Item not found in order");

  item.status = status as any;
  
  // If all items are ready, automatically update order status
  const allReady = order.items.every(i => i.status === "ready" || i.status === "done");
  if (allReady) {
    order.status = "ready";
  } else if (order.status === "new" && status === "preparing") {
    order.status = "preparing";
  }

  await order.save();
  return order;
};

export const markOrderReady = async (restaurantId: string, branchId: string, orderId: string) => {
  const order = await Order.findOne({ _id: orderId, restaurantId, branchId, isDelete: false });
  if (!order) throw new Error("Order not found");

  order.status = "ready";
  // also mark all items as ready
  order.items.forEach(item => {
    if (item.status === "new" || item.status === "preparing") {
      item.status = "ready";
    }
  });

  await order.save();
  return order;
};
