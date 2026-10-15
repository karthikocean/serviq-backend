import Order from "../../models/Order";
import Table from "../../models/Table";
import Branch from "../../models/Branch";

export const getOrders = async (
  restaurantId: string,
  branchId?: string,
  status?: string,
  billingStatus?: string,
  waiterId?: string,
  page: number = 0,
  limit: number = 10
) => {
  const query: any = { restaurantId, isDelete: false };
  if (branchId && branchId !== "ALL" && branchId !== "All" && branchId !== "COMPANY" && branchId !== "company") {
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
    .populate("branchId", "branchName branchCode")
    .populate("waiterId", "name phoneNumber")
    .populate("items.menuId", "name image veg category")
    .sort({ createdAt: -1 })
    .skip(page * limit)
    .limit(limit);
    
  return { orders, totalCount };
};

export const getOrderById = async (restaurantId: string, branchId: string | undefined, orderId: string) => {
  const query: any = { _id: orderId, restaurantId, isDelete: false };
  if (branchId && branchId !== "ALL" && branchId !== "All" && branchId !== "COMPANY" && branchId !== "company") {
    query.branchId = branchId;
  }
  const order = await Order.findOne(query)
    .populate("tableId", "tableNumber section")
    .populate("branchId", "branchName branchCode")
    .populate("waiterId", "name phoneNumber")
    .populate("items.menuId", "name image veg category");
    
  if (!order) throw new Error("Order not found");
  return order;
};

export const createOrder = async (restaurantId: string, branchId: string, orderData: any) => {
  // If table is provided, resolve branchId if needed and check for existing active unpaid order
  if (orderData.tableId) {
    if (!branchId || branchId === "ALL" || branchId === "All") {
      const table = await Table.findById(orderData.tableId);
      if (table && table.branchId) {
        branchId = table.branchId.toString();
      }
    }

    const existingOrderQuery: any = {
      tableId: orderData.tableId,
      restaurantId,
      status: { $nin: ["cancelled", "completed"] },
      billingStatus: "unpaid",
      isDelete: false
    };
    if (branchId && branchId !== "ALL" && branchId !== "All") {
      existingOrderQuery.branchId = branchId;
    }

    const existingOrder = await Order.findOne(existingOrderQuery);

    if (existingOrder) {
      // Append new items to existing active order instead of erroring
      if (orderData.items && orderData.items.length > 0) {
        for (const newItem of orderData.items) {
          const newItemMenuId = newItem.menuId && typeof newItem.menuId === 'object' && newItem.menuId._id
            ? newItem.menuId._id
            : newItem.menuId;

          const existingItemIndex = existingOrder.items.findIndex((item: any) => {
            const itemMenuId = item.menuId && typeof item.menuId === 'object' && item.menuId._id
              ? item.menuId._id
              : item.menuId;

            if (itemMenuId && newItemMenuId) return String(itemMenuId) === String(newItemMenuId);
            return item.name?.toLowerCase() === newItem.name?.toLowerCase();
          });

          if (existingItemIndex > -1) {
            existingOrder.items[existingItemIndex].qty = (existingOrder.items[existingItemIndex].qty || 1) + (newItem.qty || 1);
          } else {
            existingOrder.items.push({
              ...newItem,
              menuId: newItemMenuId
            });
          }
        }
        existingOrder.markModified('items');
      }

      // Add totals
      existingOrder.subtotal = (existingOrder.subtotal || 0) + (orderData.subtotal || 0);
      existingOrder.tax = (existingOrder.tax || 0) + (orderData.tax || 0);
      existingOrder.charge = (existingOrder.charge || 0) + (orderData.charge || 0);
      existingOrder.total = (existingOrder.total || 0) + (orderData.total || 0);
      if (orderData.notes) {
        existingOrder.notes = existingOrder.notes
          ? `${existingOrder.notes} | ${orderData.notes}`
          : orderData.notes;
      }
      if (orderData.waiterId && !existingOrder.waiterId) {
        existingOrder.waiterId = orderData.waiterId;
      }

      await existingOrder.save();

      // Ensure table status remains Occupied
      await Table.updateOne(
        { _id: orderData.tableId },
        { status: "Occupied" }
      );

      return existingOrder;
    }
  }

  let prefix = "ORD";
  if (branchId && branchId !== "ALL" && branchId !== "All") {
    const branch = await Branch.findById(branchId);
    if (branch && branch.branchName) {
      const initials = branch.branchName.trim().split(/\s+/).map(word => word.charAt(0)).join('').toUpperCase();
      prefix = `ORD-${initials}`;
    }
  }

  const query: any = { restaurantId, isDelete: false };
  if (branchId && branchId !== "ALL" && branchId !== "All") query.branchId = branchId;
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
      { _id: orderData.tableId },
      { status: "Occupied" }
    );
  }

  return newOrder;
};

export const updateOrderStatus = async (restaurantId: string, branchId: string, orderId: string, status: string) => {
  const order = await Order.findOne({ _id: orderId, restaurantId, branchId, isDelete: false });
  if (!order) throw new Error("Order not found");

  order.status = status as any;
  
  // If order is completed, we don't automatically free table since they might still need to pay.
  // The table freeing will happen during billing process.
  await order.save();
  return order;
};

export const updateOrderItems = async (restaurantId: string, branchId: string, orderId: string, updateData: any) => {
  const order = await Order.findOne({ _id: orderId, restaurantId, branchId, isDelete: false });
  if (!order) throw new Error("Order not found");

  if (updateData.items) {
    // Sanitize menuId in case frontend sends populated objects
    order.items = updateData.items.map((item: any) => {
      if (item.menuId && typeof item.menuId === 'object' && item.menuId._id) {
        item.menuId = item.menuId._id;
      }
      return item;
    });
  }
  
  if (updateData.subtotal !== undefined) order.subtotal = updateData.subtotal;
  if (updateData.tax !== undefined) order.tax = updateData.tax;
  if (updateData.charge !== undefined) order.charge = updateData.charge;
  if (updateData.total !== undefined) order.total = updateData.total;
  if (updateData.status) order.status = updateData.status;
  if (updateData.waiterId !== undefined) order.waiterId = updateData.waiterId;

  await order.save();
  return order;
};

export const appendOrderItems = async (restaurantId: string, branchId: string, orderId: string, newItems: any[], additionalTotals: any) => {
  const order = await Order.findOne({ _id: orderId, restaurantId, branchId, isDelete: false });
  if (!order) throw new Error("Order not found");

  if (newItems && newItems.length > 0) {
    for (const newItem of newItems) {
      const existingItemIndex = order.items.findIndex((item: any) => {
        if (item.menuId && newItem.menuId) return String(item.menuId) === String(newItem.menuId);
        return item.name.toLowerCase() === newItem.name.toLowerCase();
      });

      if (existingItemIndex > -1) {
        order.items[existingItemIndex].qty = (order.items[existingItemIndex].qty || 1) + (newItem.qty || 1);
      } else {
        order.items.push(newItem);
      }
    }
    order.markModified('items');
  }

  // Add the totals
  if (additionalTotals) {
    order.subtotal = (order.subtotal || 0) + (additionalTotals.subtotal || 0);
    order.tax = (order.tax || 0) + (additionalTotals.tax || 0);
    order.charge = (order.charge || 0) + (additionalTotals.charge || 0);
    order.total = (order.total || 0) + (additionalTotals.total || 0);
  }

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

export const assignWaiterToOrder = async (
  restaurantId: string,
  branchId: string,
  orderId: string,
  waiterId: string
) => {
  const order = await Order.findOne({ _id: orderId, restaurantId, branchId, isDelete: false });
  if (!order) throw new Error("Order not found");

  order.waiterId = waiterId as any;
  await order.save();

  const updated = await Order.findById(order._id)
    .populate("tableId", "tableNumber section")
    .populate("waiterId", "name phoneNumber")
    .populate("items.menuId", "name image veg category");

  return updated;
};
