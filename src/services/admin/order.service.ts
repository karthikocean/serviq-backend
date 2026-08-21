import Order from "../../models/Order";
import Table from "../../models/Table";
import Branch from "../../models/Branch";

export const getOrders = async (
  restaurantId: string,
  branchId: string,
  status?: string,
  billingStatus?: string,
  waiterId?: string,
  page: number = 0,
  limit: number = 10
) => {
  const query: any = { restaurantId, isDelete: false };
  if (branchId && branchId !== "ALL") {
    query.branchId = branchId;
  }
  if (status) query.status = status;
  if (billingStatus) query.billingStatus = billingStatus;
  
  if (waiterId) {
    if (waiterId === "unassigned") {
      query.$or = [{ waiterId: { $exists: false } }, { waiterId: null }];
    } else {
      query.waiterId = waiterId;
    }
  }

  const totalCount = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .populate("tableId", "tableNumber section")
    .populate("waiterId", "name phoneNumber")
    .populate("items.menuId", "name image veg category")
    .sort({ createdAt: -1 })
    .skip(page * limit)
    .limit(limit);
    
  return { orders, totalCount };
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
  // If table is provided, check for existing unpaid order
  if (orderData.tableId) {
    const existingOrder = await Order.findOne({
      tableId: orderData.tableId,
      restaurantId,
      branchId,
      billingStatus: "unpaid",
      isDelete: false
    });

    if (existingOrder) {
      // Append new items
      if (orderData.items && orderData.items.length > 0) {
        existingOrder.items.push(...orderData.items);
      }
      
      // Add totals
      existingOrder.subtotal = (existingOrder.subtotal || 0) + (orderData.subtotal || 0);
      existingOrder.tax = (existingOrder.tax || 0) + (orderData.tax || 0);
      existingOrder.charge = (existingOrder.charge || 0) + (orderData.charge || 0);
      existingOrder.total = (existingOrder.total || 0) + (orderData.total || 0);
      
      await existingOrder.save();
      return existingOrder;
    }
  }

  let prefix = "ORD";
  if (branchId && branchId !== "ALL") {
    const branch = await Branch.findById(branchId);
    if (branch && branch.branchName) {
      const initials = branch.branchName.trim().split(/\s+/).map(word => word.charAt(0)).join('').toUpperCase();
      prefix = `ORD-${initials}`;
    }
  }

  const query: any = { restaurantId, isDelete: false };
  if (branchId && branchId !== "ALL") query.branchId = branchId;
  const lastOrder = await Order.findOne(query).sort({ _id: -1 });
  let nextNumber = 1;
  if (lastOrder && lastOrder.orderId) {
    const match = lastOrder.orderId.match(/\d+$/);
    if (match) {
      const parsed = parseInt(match[0], 10);
      if (!isNaN(parsed)) {
        nextNumber = parsed + 1;
      }
    }
  }
  const orderId = `${prefix}-${nextNumber.toString().padStart(4, "0")}`;

  const newOrder = new Order({
    ...orderData,
    restaurantId,
    branchId,
    orderId,
    time: new Date().toLocaleTimeString("en-US", { hour12: true, hour: "numeric", minute: "2-digit", second: "2-digit" })
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
  if (updateData.waiterId !== undefined) order.waiterId = updateData.waiterId;

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
