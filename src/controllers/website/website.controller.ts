import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import QrCode from "../../models/QrCode";
import Table from "../../models/Table";
import Restaurant from "../../models/Restaurant";
import Branch from "../../models/Branch";
import Category from "../../models/Category";
import Menu from "../../models/Menu";
import Order from "../../models/Order";
import Notification from "../../models/Notification";
import { sendSuccess, sendError } from "../../utils/response";
import { getIO } from "../../socket";


export const scanQrCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawQrId = req.params.qrCodeId || req.query.qrCodeId;
    const qrCodeId = Array.isArray(rawQrId) ? String(rawQrId[0]) : String(rawQrId || "");

    if (!qrCodeId || qrCodeId === "undefined") {
      sendError(res, "QR Code ID is required", StatusCodes.BAD_REQUEST);
      return;
    }

    // Try finding by QrCode collection first
    let qr = await QrCode.findOne({ qrCodeId, isDelete: false })
      .populate("restaurantId", "restaurantName name logo coverImage address currency phone")
      .populate("branchId", "branchName address city phone")
      .populate("tableId", "tableNumber section seatingCapacity status");

    let restaurant: any = null;
    let branch: any = null;
    let table: any = null;

    if (qr) {
      qr.scansCount = (qr.scansCount || 0) + 1;
      await qr.save();

      restaurant = qr.restaurantId;
      branch = qr.branchId;
      table = qr.tableId;
    } else {
      let tableDoc: any = null;
      if (mongoose.Types.ObjectId.isValid(qrCodeId)) {
        tableDoc = await Table.findOne({ _id: qrCodeId, isDelete: false })
          .populate("restaurantId", "restaurantName name logo coverImage address currency phone")
          .populate("branchId", "branchName address city phone");
      }

      if (!tableDoc) {
        tableDoc = await Table.findOne({ assignedQrId: qrCodeId, isDelete: false })
          .populate("restaurantId", "restaurantName name logo coverImage address currency phone")
          .populate("branchId", "branchName address city phone");
      }

      if (!tableDoc) {
        sendError(res, "Invalid or expired QR code", StatusCodes.NOT_FOUND);
        return;
      }

      restaurant = tableDoc.restaurantId;
      branch = tableDoc.branchId;
      table = {
        _id: tableDoc._id,
        tableNumber: tableDoc.tableNumber,
        section: tableDoc.section,
        seatingCapacity: tableDoc.seatingCapacity,
        status: tableDoc.status
      };
    }

    sendSuccess(res, "QR code resolved successfully", {
      qrCodeId,
      restaurant: {
        _id: restaurant?._id,
        name: restaurant?.restaurantName || restaurant?.name || "Restaurant",
        logo: restaurant?.logo || "",
        coverImage: restaurant?.coverImage || "",
        address: restaurant?.address || "",
        currency: restaurant?.currency || "₹"
      },
      branch: {
        _id: branch?._id,
        name: branch?.branchName || "Main Branch",
        address: branch?.address || ""
      },
      table: {
        _id: table?._id,
        tableNumber: table?.tableNumber || "Table",
        section: table?.section || "Main",
        seatingCapacity: table?.seatingCapacity || 4,
        status: table?.status || "Available"
      }
    });
  } catch (error: any) {
    console.error("Error in scanQrCode:", error);
    sendError(res, "Failed to resolve QR code", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * 2. Get Restaurant & Table Header Details
 * GET /api/website/header
 */
export const getHeaderInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const restaurantId = req.query.restaurantId ? String(req.query.restaurantId) : "";
    const branchId = req.query.branchId ? String(req.query.branchId) : "";
    const tableId = req.query.tableId ? String(req.query.tableId) : "";

    if (!restaurantId || !branchId) {
      sendError(res, "restaurantId and branchId are required", StatusCodes.BAD_REQUEST);
      return;
    }

    const restaurant = await Restaurant.findById(restaurantId).select("restaurantName name logo coverImage address currency");
    const branch = await Branch.findById(branchId).select("branchName address city");
    let table = null;
    if (tableId && mongoose.Types.ObjectId.isValid(tableId)) {
      table = await Table.findById(tableId).select("tableNumber section seatingCapacity status");
    }

    sendSuccess(res, "Header information fetched successfully", {
      restaurant: {
        _id: restaurant?._id,
        name: (restaurant as any)?.restaurantName || (restaurant as any)?.name || "Restaurant",
        logo: (restaurant as any)?.logo || "",
        address: (restaurant as any)?.address || "",
        currency: (restaurant as any)?.currency || "₹"
      },
      branch: {
        _id: branch?._id,
        name: (branch as any)?.branchName || "Main Branch",
        address: (branch as any)?.address || ""
      },
      table: table ? {
        _id: (table as any)?._id,
        tableNumber: (table as any)?.tableNumber,
        section: (table as any)?.section
      } : null
    });
  } catch (error) {
    sendError(res, "Failed to fetch header info", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * 3. Service Request / Quick Help (Water, Bill, Message)
 * POST /api/website/service-request
 */
export const sendQuickHelp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { restaurantId, branchId, tableId, requestType, message } = req.body;

    if (!restaurantId || !branchId || !tableId || !requestType) {
      sendError(res, "restaurantId, branchId, tableId, and requestType are required", StatusCodes.BAD_REQUEST);
      return;
    }

    const table = await Table.findById(tableId);
    const tableName = table ? table.tableNumber : "Table";

    const title = `Quick Help: ${requestType}`;
    const notificationMessage = `${tableName} requested ${requestType}${message ? `: ${message}` : ""}`;

    // Create Notification document for Waiter/Staff
    const notification = new Notification({
      restaurantId: new mongoose.Types.ObjectId(String(restaurantId)),
      branchId: new mongoose.Types.ObjectId(String(branchId)),
      receiverType: "WAITER",
      receiverId: table?.assignedWaiter || null,
      type: "SERVICE_REQUEST",
      title,
      message: notificationMessage
    });
    await notification.save();

    // Trigger Realtime Socket Event if available
    try {
      const io = getIO();
      if (io) {
        io.to(`room_branch_${branchId}`).emit("service_request", {
          notificationId: notification._id,
          requestType,
          tableId,
          tableName,
          message: notificationMessage,
          createdAt: new Date()
        });
      }
    } catch (err) {
      console.warn("Socket not ready or client disconnected:", err);
    }

    sendSuccess(res, `Help request for '${requestType}' sent to staff successfully!`, {
      requestId: notification._id,
      requestType,
      tableName
    });
  } catch (error) {
    console.error("Error in sendQuickHelp:", error);
    sendError(res, "Failed to send quick help request", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * 4. Get Menu Categories
 * GET /api/website/categories
 */
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const restaurantId = req.query.restaurantId ? String(req.query.restaurantId) : "";
    const branchId = req.query.branchId ? String(req.query.branchId) : "";

    if (!restaurantId || !branchId) {
      sendError(res, "restaurantId and branchId are required", StatusCodes.BAD_REQUEST);
      return;
    }

    const categories = await Category.find({
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      branchId: new mongoose.Types.ObjectId(branchId),
      status: { $ne: "INACTIVE" }
    }).sort({ createdAt: 1 });

    sendSuccess(res, "Categories fetched successfully", categories);
  } catch (error) {
    sendError(res, "Failed to fetch categories", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * 5. Get Menu Items (Full Menu, Search, Filters)
 * GET /api/website/menu
 */
export const getMenuItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const restaurantId = req.query.restaurantId ? String(req.query.restaurantId) : "";
    const branchId = req.query.branchId ? String(req.query.branchId) : "";
    const categoryId = req.query.categoryId ? String(req.query.categoryId) : "";
    const search = req.query.search ? String(req.query.search) : "";
    const isVeg = req.query.isVeg ? String(req.query.isVeg) : "";
    const bestseller = req.query.bestseller ? String(req.query.bestseller) : "";

    if (!restaurantId || !branchId) {
      sendError(res, "restaurantId and branchId are required", StatusCodes.BAD_REQUEST);
      return;
    }

    const query: any = {
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      branchId: new mongoose.Types.ObjectId(branchId),
      isDelete: false,
      isActive: true,
      available: true
    };

    if (categoryId && categoryId !== "all" && mongoose.Types.ObjectId.isValid(categoryId)) {
      query.category = new mongoose.Types.ObjectId(categoryId);
    }

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (isVeg === "true") {
      query.veg = true;
    } else if (isVeg === "false") {
      query.veg = false;
    }

    if (bestseller === "true") {
      query.bestseller = true;
    }

    const items = await Menu.find(query)
      .populate("category", "name description")
      .sort({ bestseller: -1, name: 1 });

    sendSuccess(res, "Menu items fetched successfully", items);
  } catch (error) {
    sendError(res, "Failed to fetch menu items", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * 6. Get Today's Specials / Best Sellers
 * GET /api/website/specials
 */
export const getSpecials = async (req: Request, res: Response): Promise<void> => {
  try {
    const restaurantId = req.query.restaurantId ? String(req.query.restaurantId) : "";
    const branchId = req.query.branchId ? String(req.query.branchId) : "";

    if (!restaurantId || !branchId) {
      sendError(res, "restaurantId and branchId are required", StatusCodes.BAD_REQUEST);
      return;
    }

    const specials = await Menu.find({
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      branchId: new mongoose.Types.ObjectId(branchId),
      isDelete: false,
      isActive: true,
      available: true,
      bestseller: true
    })
      .populate("category", "name")
      .limit(10);

    sendSuccess(res, "Today's specials fetched successfully", specials);
  } catch (error) {
    sendError(res, "Failed to fetch today's specials", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * 7. Get Active Orders for Table
 * GET /api/website/orders
 */
export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const tableId = req.query.tableId ? String(req.query.tableId) : "";
    const restaurantId = req.query.restaurantId ? String(req.query.restaurantId) : "";
    const branchId = req.query.branchId ? String(req.query.branchId) : "";

    if (!tableId || !mongoose.Types.ObjectId.isValid(tableId)) {
      sendError(res, "Valid tableId is required", StatusCodes.BAD_REQUEST);
      return;
    }

    const query: any = {
      tableId: new mongoose.Types.ObjectId(tableId),
      isDelete: false,
      status: { $ne: "completed" }
    };

    if (restaurantId && mongoose.Types.ObjectId.isValid(restaurantId)) {
      query.restaurantId = new mongoose.Types.ObjectId(restaurantId);
    }
    if (branchId && mongoose.Types.ObjectId.isValid(branchId)) {
      query.branchId = new mongoose.Types.ObjectId(branchId);
    }

    const orders = await Order.find(query)
      .populate("tableId", "tableNumber section")
      .populate("items.menuId", "name image veg price")
      .sort({ createdAt: -1 });

    sendSuccess(res, "Orders fetched successfully", orders);
  } catch (error) {
    sendError(res, "Failed to fetch orders", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * 8. Create Order (Checkout / Cart Summary)
 * POST /api/website/orders/create
 */
export const createCustomerOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      restaurantId,
      branchId,
      tableId,
      items,
      cookingPreferences,
      notes,
      paymentMethod
    } = req.body;

    if (!restaurantId || !branchId || !tableId || !items || !Array.isArray(items) || items.length === 0) {
      sendError(res, "restaurantId, branchId, tableId, and items are required", StatusCodes.BAD_REQUEST);
      return;
    }

    // Format items
    const formattedItems = items.map((item: any) => ({
      menuId: new mongoose.Types.ObjectId(String(item.menuId || item._id)),
      name: String(item.name),
      qty: Number(item.quantity || item.qty || 1),
      price: Number(item.price),
      status: "new"
    }));

    // Calculate subtotal
    const subtotal = formattedItems.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
    const tax = Math.round(subtotal * 0.05); // 5% GST
    const total = subtotal + tax;

    // Combine notes with cooking preferences if provided
    let combinedNotes = notes || "";
    if (cookingPreferences) {
      const spice = cookingPreferences.spiceLevel ? `Spice: ${cookingPreferences.spiceLevel}` : "";
      const inst = cookingPreferences.specialInstructions ? `Inst: ${cookingPreferences.specialInstructions}` : "";
      combinedNotes = [spice, inst, combinedNotes].filter(Boolean).join(" | ");
    }

    // Generate Order ID Prefix
    let prefix = "ORD";
    if (branchId) {
      const branch = await Branch.findById(branchId);
      if (branch && branch.branchName) {
        const initials = branch.branchName.trim().split(/\s+/).map(w => w.charAt(0)).join('').toUpperCase();
        prefix = `ORD-${initials}`;
      }
    }

    const lastOrder = await Order.findOne({
      restaurantId: new mongoose.Types.ObjectId(String(restaurantId)),
      branchId: new mongoose.Types.ObjectId(String(branchId)),
      isDelete: false
    }).sort({ _id: -1 });

    let nextNumber = 1;
    if (lastOrder && lastOrder.orderId) {
      const match = lastOrder.orderId.match(/\d+$/);
      if (match) {
        const parsed = parseInt(match[0], 10);
        if (!isNaN(parsed)) nextNumber = parsed + 1;
      }
    }
    const orderId = `${prefix}-${nextNumber.toString().padStart(4, "0")}`;

    const newOrder = new Order({
      restaurantId: new mongoose.Types.ObjectId(String(restaurantId)),
      branchId: new mongoose.Types.ObjectId(String(branchId)),
      orderId,
      tableId: new mongoose.Types.ObjectId(String(tableId)),
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      items: formattedItems,
      notes: combinedNotes,
      subtotal,
      tax,
      charge: 0,
      total,
      discount: 0,
      status: "new",
      billingStatus: "unpaid",
      paymentMethod: paymentMethod ? paymentMethod.toLowerCase() : "cash"
    });

    await newOrder.save();

    // Update Table status to "Occupied"
    await Table.findByIdAndUpdate(tableId, { status: "Occupied" });

    // Create Notification for Kitchen & Waiter
    const table = await Table.findById(tableId);
    const tableName = table ? table.tableNumber : "Table";

    const notification = new Notification({
      restaurantId: new mongoose.Types.ObjectId(String(restaurantId)),
      branchId: new mongoose.Types.ObjectId(String(branchId)),
      receiverType: "KITCHEN",
      orderId: newOrder._id,
      type: "NEW_ORDER",
      title: `New Order: ${orderId}`,
      message: `${tableName} placed a new order for ${formattedItems.length} items.`
    });
    await notification.save();

    // Realtime socket emit
    try {
      const io = getIO();
      if (io) {
        io.to(`room_branch_${branchId}`).emit("new_order", {
          order: newOrder,
          tableName,
          createdAt: new Date()
        });
      }
    } catch (err) {
      console.warn("Socket notification warning:", err);
    }

    sendSuccess(res, "Order placed successfully!", {
      orderId: newOrder._id,
      orderNumber: newOrder.orderId,
      status: newOrder.status,
      tableName,
      subtotal: newOrder.subtotal,
      tax: newOrder.tax,
      total: newOrder.total,
      createdAt: newOrder.createdAt
    }, StatusCodes.CREATED);
  } catch (error: any) {
    console.error("Error in createCustomerOrder:", error);
    sendError(res, "Failed to create order", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
