import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import Order from "../../../models/Order";
import Table from "../../../models/Table";
import Menu from "../../../models/Menu";
import Billing from "../../../models/Billing";
import User from "../../../models/User";
import { AuthRequest } from "../../../middleware/authMiddleware";
import { sendSuccess, sendError } from "../../../utils/response";
import { pagination } from "../../../utils/pagination";
import { sendNotification } from "../../../utils/notificationHelper";

export const getActiveOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId, activeBranchId } = req.user!;
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = page * limit;

    const query: any = {
      restaurantId,
      branchId: activeBranchId,
      status: { $nin: ["completed", "cancelled"] },
      isDelete: false
    };

    const totalCount = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate("tableId", "tableNumber section")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    pagination(totalCount, orders, limit, page, res, "Active orders fetched");
  } catch (error) {
    console.error("Waiter Get Active Orders Error:", error);
    sendError(res, "Failed to fetch active orders", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getOrderHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId, activeBranchId } = req.user!;
    const { date } = req.query;
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = page * limit;

    const query: any = {
      restaurantId,
      branchId: activeBranchId,
      status: { $in: ["completed", "cancelled"] },
      isDelete: false
    };

    if (date) {
      const startOfDay = new Date(date as string);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date as string);
      endOfDay.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    const totalCount = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate("tableId", "tableNumber section")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    pagination(totalCount, orders, limit, page, res, "Order history fetched");
  } catch (error) {
    console.error("Waiter Get Order History Error:", error);
    sendError(res, "Failed to fetch order history", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId, activeBranchId, userId } = req.user!;
    const { tableId, items, notes } = req.body;

    const table = await Table.findOne({ _id: tableId, branchId: activeBranchId });
    if (!table) return sendError(res, "Table not found", StatusCodes.NOT_FOUND);

    // Fetch menu items to get accurate prices and GST
    const menuIds = items.map((item: any) => item.id);
    const menuItems = await Menu.find({ _id: { $in: menuIds }, branchId: activeBranchId });

    let subtotal = 0;
    let tax = 0;

    const formattedItems = items.map((item: any) => {
      const menuData = menuItems.find(m => m._id.toString() === item.id);
      const price = menuData ? menuData.price : (item.price || 0);
      const gstPercent = menuData ? menuData.gst : 0;
      
      const itemSubtotal = price * item.qty;
      const itemTax = itemSubtotal * (gstPercent / 100);

      subtotal += itemSubtotal;
      tax += itemTax;

      return {
        menuId: item.id,
        name: menuData ? menuData.name : (item.name || "Unknown Item"),
        qty: item.qty,
        price: price,
        status: "new"
      };
    });

    const total = subtotal + tax; // Add charge or discount here if needed later

    const newOrder = await Order.create({
      restaurantId,
      branchId: activeBranchId,
      orderId: "ORD-" + Date.now().toString().slice(-6),
      time: new Date().toLocaleTimeString(),
      tableId,
      waiterId: userId,
      items: formattedItems,
      subtotal,
      tax,
      total,
      notes,
      status: "new"
    });

    table.status = "Occupied";
    await table.save();

    await sendNotification({
      restaurantId: restaurantId as string,
      branchId: activeBranchId as string,
      receiverType: "KITCHEN",
      type: "NEW_ORDER",
      title: "New KOT Received",
      message: `Table ${table.tableNumber} has placed a new order.`,
      orderId: newOrder._id.toString(),
      dataPayload: {
        orderId: newOrder._id,
        tableNumber: table.tableNumber,
        items: formattedItems
      }
    });

    sendSuccess(res, "Order created successfully", newOrder, StatusCodes.CREATED);
  } catch (error) {
    console.error("Waiter Create Order Error:", error);
    sendError(res, "Failed to create order", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const addItemsToOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId, activeBranchId } = req.user!;
    const { id } = req.params;
    const { items } = req.body;

    const order = await Order.findOne({ _id: id, branchId: activeBranchId, isDelete: false });
    if (!order) return sendError(res, "Order not found", StatusCodes.NOT_FOUND);

    const menuIds = items.map((item: any) => item.id);
    const menuItems = await Menu.find({ _id: { $in: menuIds }, branchId: activeBranchId });

    let addedSubtotal = 0;
    let addedTax = 0;

    const formattedItems = items.map((item: any) => {
      const menuData = menuItems.find(m => m._id.toString() === item.id);
      const price = menuData ? menuData.price : (item.price || 0);
      const gstPercent = menuData ? menuData.gst : 0;
      
      const itemSubtotal = price * item.qty;
      const itemTax = itemSubtotal * (gstPercent / 100);

      addedSubtotal += itemSubtotal;
      addedTax += itemTax;

      return {
        menuId: item.id,
        name: menuData ? menuData.name : (item.name || "Unknown Item"),
        qty: item.qty,
        price: price,
        status: "new"
      };
    });

    order.items.push(...formattedItems);
    order.subtotal = (order.subtotal || 0) + addedSubtotal;
    order.tax = (order.tax || 0) + addedTax;
    order.total = order.subtotal + order.tax + (order.charge || 0) - (order.discount || 0);
    
    await order.save();

    await sendNotification({
      restaurantId: restaurantId as string,
      branchId: activeBranchId as string,
      receiverType: "KITCHEN",
      type: "ORDER_UPDATED",
      title: "Order Updated",
      message: `New items added to Order #${order.orderId}`,
      orderId: order._id.toString(),
      dataPayload: {
        orderId: order._id,
        newItems: formattedItems
      }
    });

    sendSuccess(res, "Items added successfully", order);
  } catch (error) {
    console.error("Waiter Add Items Error:", error);
    sendError(res, "Failed to add items to order", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId, activeBranchId } = req.user!;
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findOne({ _id: id, branchId: activeBranchId, isDelete: false });
    if (!order) return sendError(res, "Order not found", StatusCodes.NOT_FOUND);

    if (status === "cancelled") {
      if (order.status === "ready" || order.status === "served" || order.status === "completed") {
        return sendError(res, "Order cannot be cancelled at this stage", StatusCodes.BAD_REQUEST);
      }
    }

    if (status === "completed") {
      if (order.billingStatus !== "paid") {
        return sendError(res, "Order cannot be marked completed until it is paid", StatusCodes.BAD_REQUEST);
      }
    }

    order.status = status;
    await order.save();

    if (status === "cancelled") {
      await sendNotification({
        restaurantId: restaurantId as string,
        branchId: activeBranchId as string,
        receiverType: "KITCHEN",
        type: "ORDER_CANCELLED",
        title: "Order Cancelled",
        message: `Waiter cancelled Order #${order.orderId}`,
        orderId: order._id.toString(),
        dataPayload: {
          orderId: order._id
        }
      });
    }

    sendSuccess(res, "Order status updated", order);
  } catch (error) {
    console.error("Waiter Update Order Status Error:", error);
    sendError(res, "Failed to update order status", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const generateBill = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId, activeBranchId } = req.user!;
    const { id } = req.params;

    const order = await Order.findOne({ _id: id, branchId: activeBranchId, isDelete: false })
      .populate("items.menuId");
      
    if (!order) return sendError(res, "Order not found", StatusCodes.NOT_FOUND);

    // Assume calculations logic here
    const billData = {
      orderId: order._id,
      subtotal: order.subtotal,
      tax: order.tax,
      discount: order.discount,
      charge: order.charge,
      grandTotal: order.total
    };

    sendSuccess(res, "Bill generated", billData);
  } catch (error) {
    console.error("Waiter Generate Bill Error:", error);
    sendError(res, "Failed to generate bill", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const checkoutOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId, activeBranchId } = req.user!;
    const { id } = req.params;
    const { paymentMethod } = req.body;

    if (!["cash", "card", "upi"].includes(paymentMethod)) {
      return sendError(res, "Invalid payment method", StatusCodes.BAD_REQUEST);
    }

    // Double Checkout Protection via strict query
    const order = await Order.findOne({ 
      _id: id, 
      branchId: activeBranchId, 
      restaurantId,
      isDelete: false,
      billingStatus: "unpaid"
    });

    if (!order) {
      return sendError(res, "Order not found or already paid", StatusCodes.NOT_FOUND);
    }

    if (order.status !== "served") {
      return sendError(res, "Only served orders can be checked out", StatusCodes.BAD_REQUEST);
    }

    // Generate Invoice Number
    const lastBilling = await Billing.findOne({ restaurantId }).sort({ createdAt: -1 });
    let nextInvoiceNumber = 10001;
    if (lastBilling && lastBilling.invoiceId && lastBilling.invoiceId.startsWith("INV-")) {
      const lastNumber = parseInt(lastBilling.invoiceId.replace("INV-", ""), 10);
      if (!isNaN(lastNumber)) {
        nextInvoiceNumber = lastNumber + 1;
      }
    }
    const invoiceId = `INV-${nextInvoiceNumber}`;

    // Get Waiter details
    let staffName = "Waiter";
    if (order.waiterId) {
      const waiter = await User.findById(order.waiterId);
      if (waiter) staffName = waiter.name;
    }

    // Get Table details
    let tableNumber = "N/A";
    const tableDoc = await Table.findById(order.tableId);
    if (tableDoc) tableNumber = tableDoc.tableNumber;

    // Create Items Array for Billing
    const items = order.items.map(item => ({
      name: item.name,
      qty: item.qty,
      price: item.price,
      total: (item.qty || 1) * (item.price || 0)
    }));

    // Double check totals
    const totalAmount = Math.max(0, (order.subtotal || 0) + (order.tax || 0) + (order.charge || 0) - (order.discount || 0));

    // Create Billing Record
    const billingRecord = new Billing({
      restaurantId,
      branchId: activeBranchId,
      orderId: order._id,
      orderRefId: order.orderId,
      invoiceId,
      tableNumber,
      subtotal: order.subtotal || 0,
      tax: order.tax || 0,
      discount: order.discount || 0,
      charge: order.charge || 0,
      totalAmount,
      paymentMethod,
      paymentStatus: "Paid",
      staffName,
      items
    });

    await billingRecord.save();

    // Update Order
    order.billingStatus = "paid";
    order.paymentMethod = paymentMethod;
    order.status = "completed";
    await order.save();

    // Free up table
    if (tableDoc) {
      tableDoc.status = "Available";
      await tableDoc.save();
    }

    sendSuccess(res, "Order checked out and billed successfully", { invoiceId: billingRecord.invoiceId, paymentMethod });
  } catch (error) {
    console.error("Waiter Checkout Error:", error);
    sendError(res, "Failed to checkout", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
