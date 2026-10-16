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
import Cart from "../../models/Cart";
import { sendSuccess, sendError } from "../../utils/response";
import { getIO } from "../../socket";
import { resolveMenuBranchId } from "../../utils/menuUtils";


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
      .populate({
        path: "tableId",
        select: "tableNumber section seatingCapacity status assignedWaiter",
        populate: { path: "assignedWaiter", select: "name phoneNumber" }
      });

    let restaurant: any = null;
    let branch: any = null;
    let table: any = null;
    let waiterName: string | null = null;

    if (qr) {
      qr.scansCount = (qr.scansCount || 0) + 1;
      await qr.save();

      restaurant = qr.restaurantId;
      branch = qr.branchId;
      table = qr.tableId;
      waiterName = (table as any)?.assignedWaiter?.name || null;
    } else {
      let tableDoc: any = null;
      if (mongoose.Types.ObjectId.isValid(qrCodeId)) {
        tableDoc = await Table.findOne({ _id: qrCodeId, isDelete: false })
          .populate("restaurantId", "restaurantName name logo coverImage address currency phone")
          .populate("branchId", "branchName address city phone")
          .populate("assignedWaiter", "name phoneNumber");
      }

      if (!tableDoc) {
        tableDoc = await Table.findOne({ assignedQrId: qrCodeId, isDelete: false })
          .populate("restaurantId", "restaurantName name logo coverImage address currency phone")
          .populate("branchId", "branchName address city phone")
          .populate("assignedWaiter", "name phoneNumber");
      }

      if (!tableDoc) {
        tableDoc = await Table.findOne({ tableNumber: qrCodeId, isDelete: false })
          .populate("restaurantId", "restaurantName name logo coverImage address currency phone")
          .populate("branchId", "branchName address city phone")
          .populate("assignedWaiter", "name phoneNumber");
      }

      if (!tableDoc) {
        sendError(res, "Invalid or expired QR code", StatusCodes.NOT_FOUND);
        return;
      }

      restaurant = tableDoc.restaurantId;
      branch = tableDoc.branchId;
      waiterName = tableDoc.assignedWaiter?.name || null;
      table = {
        _id: tableDoc._id,
        tableNumber: tableDoc.tableNumber,
        section: tableDoc.section,
        seatingCapacity: tableDoc.seatingCapacity,
        status: tableDoc.status
      };
    }

    const incomingGuestId = req.query.guestId ? String(req.query.guestId).trim() : null;

    // Atomic Single Active Guest Session per Table
    const resolvedTableId = table?._id;
    let guestId: string | null = null;
    let tableStatus = table?.status || "Available";

    if (resolvedTableId) {
      const actualTable = await Table.findById(resolvedTableId);
      if (actualTable) {
        guestId = actualTable.currentGuestId || null;
        tableStatus = actualTable.status || "Available";

        // Check active dining orders
        let activeUnpaidCount = 0;
        if (guestId) {
          activeUnpaidCount = await Order.countDocuments({
            tableId: resolvedTableId,
            guestId,
            isDelete: false,
            billingStatus: "unpaid",
            status: { $nin: ["cancelled", "completed"] }
          });

          if (activeUnpaidCount > 0) {
            tableStatus = "Occupied";
          } else if (actualTable.status === "Available" || actualTable.status === "Free") {
            // Previous guest session ended and bill settled
            guestId = null;
            actualTable.currentGuestId = null;
            await actualTable.save();
          }
        }

        // 3. Collision Protection / Occupied Table Guard:
        // If the table is currently Occupied or has active unpaid orders from another customer
        const isTableOccupied = tableStatus === "Occupied" || actualTable.status === "Occupied" || activeUnpaidCount > 0;
        if (isTableOccupied) {
          // If table has an active session, verify if the scanning client is the same returning guest
          const isReturningGuest = Boolean(guestId && incomingGuestId && incomingGuestId === guestId);

          if (!isReturningGuest) {
            const tableNumStr = actualTable.tableNumber || "this table";
            sendError(
              res,
              `Table ${tableNumStr} is currently occupied by another customer. If you need assistance, please contact restaurant staff.`,
              StatusCodes.CONFLICT,
              {
                tableOccupied: true,
                tableNumber: actualTable.tableNumber,
                status: "Occupied"
              }
            );
            return;
          }
        }

        // 4. If no active guest session exists on this table, generate and assign fresh guestId.
        // Option A: Table remains "Available" while customer is only browsing menu/cart.
        // It transitions to "Occupied" only when they actually place an order (KOT sent to kitchen).
        if (!guestId) {
          const rawNum = (actualTable.tableNumber || "T").replace(/[^a-zA-Z0-9]/g, "");
          guestId = `GST-${rawNum}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          actualTable.currentGuestId = guestId;
          if (actualTable.status !== "Occupied") {
            actualTable.status = "Available";
            tableStatus = "Available";
          }
          await actualTable.save();
        }
      }
    }

    sendSuccess(res, "QR code resolved successfully", {
      qrCodeId,
      guestId,
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
        status: tableStatus,
        waiter: waiterName || null,
        guestId
      }
    });
  } catch (error: any) {
    console.error("Error in scanQrCode:", error);
    sendError(res, error?.message || "Failed to resolve QR code", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
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
    let hasActiveOrders = false;
    let isSessionValid = true;
    const reqGuestId = req.query.guestId ? String(req.query.guestId) : "";

    if (tableId && mongoose.Types.ObjectId.isValid(tableId)) {
      table = await Table.findById(tableId)
        .select("tableNumber section seatingCapacity status assignedWaiter currentGuestId")
        .populate("assignedWaiter", "name phoneNumber");

      if (table) {
        if (reqGuestId && (table as any).currentGuestId && (table as any).currentGuestId !== reqGuestId) {
          isSessionValid = false;
        }

        const activeOrderCount = await Order.countDocuments({
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          branchId: new mongoose.Types.ObjectId(branchId),
          tableId: new mongoose.Types.ObjectId(tableId),
          ...(reqGuestId ? { guestId: reqGuestId } : {}),
          billingStatus: "unpaid",
          status: { $nin: ["completed", "cancelled"] },
          isDelete: false
        });
        hasActiveOrders = activeOrderCount > 0;
      }
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
        section: (table as any)?.section,
        seatingCapacity: (table as any)?.seatingCapacity,
        status: (table as any)?.status,
        waiter: (table as any)?.assignedWaiter?.name || null,
        currentGuestId: (table as any)?.currentGuestId || null,
        isSessionValid,
        hasActiveOrders
      } : null
    });
  } catch (error: any) {
    sendError(res, error?.message || "Failed to fetch header info", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
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

    // Create Notification document for Admin / Waiter / Staff
    const notification = new Notification({
      restaurantId: new mongoose.Types.ObjectId(String(restaurantId)),
      branchId: new mongoose.Types.ObjectId(String(branchId)),
      tableId: new mongoose.Types.ObjectId(String(tableId)),
      receiverType: "ALL",
      type: "SERVICE_REQUEST",
      requestType,
      title,
      message: notificationMessage
    });
    await notification.save();

    // Trigger Realtime Socket Event if available
    try {
      const io = getIO();
      if (io) {
        const payload = {
          _id: notification._id,
          source: "CUSTOMER_WEBSITE",
          type: "SERVICE_REQUEST",
          requestType,
          title,
          tableId,
          tableName,
          branchId,
          message: notificationMessage,
          isRead: false,
          createdAt: notification.createdAt || new Date()
        };
        io.to(`room_branch_${branchId}`).emit("service_request", payload);
        io.to(`room_branch_${branchId}`).emit("admin_notification", payload);
        io.to(`room_restaurant_${restaurantId}`).emit("admin_notification", payload);
      }
    } catch (err: any) {
      console.warn("Socket not ready or client disconnected:", err);
    }

    sendSuccess(res, `Help request for '${requestType}' sent to staff successfully!`, {
      requestId: notification._id,
      requestType,
      tableName
    });
  } catch (error: any) {
    console.error("Error in sendQuickHelp:", error);
    sendError(res, error?.message || "Failed to send quick help request", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
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

    const resolvedBranchId = await resolveMenuBranchId(restaurantId, branchId);
    const targetBranchObjectId = resolvedBranchId || (branchId && mongoose.Types.ObjectId.isValid(branchId) ? new mongoose.Types.ObjectId(branchId) : undefined);

    const categoryQuery: any = {
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      status: { $ne: "INACTIVE" }
    };

    if (targetBranchObjectId) {
      categoryQuery.$or = [
        { branchId: targetBranchObjectId },
        { branchId: { $exists: false } }
      ];
    }

    const categories = await Category.find(categoryQuery).sort({ createdAt: 1 });

    sendSuccess(res, "Categories fetched successfully", categories);
  } catch (error: any) {
    sendError(res, error?.message || "Failed to fetch categories", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
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

    const resolvedBranchId = await resolveMenuBranchId(restaurantId, branchId);
    const targetBranchObjectId = resolvedBranchId || new mongoose.Types.ObjectId(branchId);

    const query: any = {
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      branchId: targetBranchObjectId,
      isDelete: false,
      isActive: true,
      available: true
    };

    if (categoryId && categoryId !== "all" && categoryId !== "undefined" && categoryId !== "null") {
      if (mongoose.Types.ObjectId.isValid(categoryId)) {
        const catObjId = new mongoose.Types.ObjectId(categoryId);
        query.$or = [{ category: catObjId }, { category: categoryId }];
      } else {
        query.category = categoryId;
      }
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
      .populate("category", "name description image")
      .sort({ bestseller: -1, name: 1 });

    sendSuccess(res, "Menu items fetched successfully", items);
  } catch (error: any) {
    sendError(res, error?.message || "Failed to fetch menu items", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
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

    const resolvedBranchId = await resolveMenuBranchId(restaurantId, branchId);
    const targetBranchObjectId = resolvedBranchId || new mongoose.Types.ObjectId(branchId);

    const specials = await Menu.find({
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      branchId: targetBranchObjectId,
      isDelete: false,
      isActive: true,
      available: true,
      bestseller: true
    })
      .populate("category", "name image")
      .limit(10);

    sendSuccess(res, "Today's specials fetched successfully", specials);
  } catch (error: any) {
    sendError(res, error?.message || "Failed to fetch today's specials", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * 7. Get Active Orders for Table with Bill Summary
 * GET /api/website/orders
 */
export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const tableId = req.query.tableId ? String(req.query.tableId) : "";
    const restaurantId = req.query.restaurantId ? String(req.query.restaurantId) : "";
    const branchId = req.query.branchId ? String(req.query.branchId) : "";
    const guestId = req.query.guestId ? String(req.query.guestId) : "";

    if (!tableId || !mongoose.Types.ObjectId.isValid(tableId)) {
      sendError(res, "Valid tableId is required", StatusCodes.BAD_REQUEST);
      return;
    }

    const query: any = {
      tableId: new mongoose.Types.ObjectId(tableId),
      isDelete: false,
      status: { $nin: ["cancelled"] }
    };

    if (guestId) {
      query.guestId = guestId;
    }
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

    // Aggregate bill safely across multi-round orders
    let combinedSubtotal = 0;
    let combinedTax = 0;
    let grandTotal = 0;
    let unpaidTotal = 0;

    for (const order of orders) {
      const activeItems = (order.items || []).filter((i: any) => i.status !== "cancelled");
      if (activeItems.length === 0 && order.status === "cancelled") continue;

      combinedSubtotal += order.subtotal || 0;
      combinedTax += order.tax || 0;
      grandTotal += order.total || 0;

      if (order.billingStatus === "unpaid") {
        unpaidTotal += order.total || 0;
      }
    }

    sendSuccess(res, "Orders fetched successfully", {
      orders,
      summary: {
        combinedSubtotal: parseFloat(combinedSubtotal.toFixed(2)),
        combinedTax: parseFloat(combinedTax.toFixed(2)),
        grandTotal: parseFloat(grandTotal.toFixed(2)),
        unpaidTotal: parseFloat(unpaidTotal.toFixed(2)),
        roundCount: orders.length
      }
    });
  } catch (error: any) {
    sendError(res, error?.message || "Failed to fetch orders", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * 8. Verify Active Guest Session on Table
 * POST /api/website/session/verify
 */
export const verifySession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { restaurantId, branchId, tableId, guestId } = req.body;
    if (!tableId || !mongoose.Types.ObjectId.isValid(tableId)) {
      sendError(res, "Valid tableId is required", StatusCodes.BAD_REQUEST);
      return;
    }

    const table = await Table.findById(tableId);
    if (!table || table.isDelete) {
      sendError(res, "Table not found", StatusCodes.NOT_FOUND);
      return;
    }

    // Check if table currentGuestId matches client session
    const isMatched = table.currentGuestId && table.currentGuestId === guestId;

    if (!isMatched) {
      sendSuccess(res, "Session mismatch or closed", {
        isValid: false,
        reason: "SESSION_EXPIRED_OR_SETTLED",
        tableStatus: table.status,
        currentGuestId: table.currentGuestId || null
      });
      return;
    }

    // Check if there are active unpaid orders for this guest
    const activeUnpaidCount = await Order.countDocuments({
      tableId: table._id,
      guestId,
      billingStatus: "unpaid",
      status: { $nin: ["cancelled", "completed"] },
      isDelete: false
    });

    sendSuccess(res, "Session verified", {
      isValid: true,
      guestId,
      tableStatus: table.status,
      hasActiveOrders: activeUnpaidCount > 0
    });
  } catch (error: any) {
    sendError(res, error?.message || "Failed to verify session", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * 9. Get Active Cart for Guest
 * GET /api/website/cart
 */
export const getCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const restaurantId = req.query.restaurantId ? String(req.query.restaurantId) : "";
    const branchId = req.query.branchId ? String(req.query.branchId) : "";
    const tableId = req.query.tableId ? String(req.query.tableId) : "";
    const guestId = req.query.guestId ? String(req.query.guestId) : "";

    if (!restaurantId || !branchId || !tableId || !guestId) {
      sendError(res, "restaurantId, branchId, tableId, and guestId are required", StatusCodes.BAD_REQUEST);
      return;
    }

    const cart = await Cart.findOne({
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      branchId: new mongoose.Types.ObjectId(branchId),
      tableId: new mongoose.Types.ObjectId(tableId),
      guestId,
      status: "active"
    }).populate("items.menuId", "name price image veg isAvailable")
      .sort({ updatedAt: -1 });

    if (cart) {
      // Touch TTL (keep alive for 4 hours from last touch)
      cart.expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);
      await cart.save();
    }

    sendSuccess(res, "Cart fetched successfully", cart || { items: [], subtotal: 0, tax: 0, total: 0 });
  } catch (error: any) {
    sendError(res, error?.message || "Failed to fetch cart", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * 10. Add or Update Item in Cart (Server-verified price & dynamic tax)
 * POST /api/website/cart/item
 */
export const updateCartItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { restaurantId, branchId, tableId, guestId, menuId, qty, notes } = req.body;
    if (!restaurantId || !branchId || !tableId || !guestId || !menuId) {
      sendError(res, "restaurantId, branchId, tableId, guestId, and menuId are required", StatusCodes.BAD_REQUEST);
      return;
    }

    // Verify Menu item from DB
    const menuItem = await Menu.findOne({
      _id: new mongoose.Types.ObjectId(String(menuId)),
      restaurantId: new mongoose.Types.ObjectId(String(restaurantId)),
      isDelete: false
    });
    if (!menuItem) {
      sendError(res, "Menu item not found or unavailable", StatusCodes.NOT_FOUND);
      return;
    }

    // Fetch Restaurant defaultTaxRate
    const restaurant = await Restaurant.findById(restaurantId).select("defaultTaxRate");
    const taxRate = typeof restaurant?.defaultTaxRate === "number" ? restaurant.defaultTaxRate : 5;

    // Atomic find-or-create to prevent race condition duplicate carts
    const cartFilter: any = {
      restaurantId: new mongoose.Types.ObjectId(String(restaurantId)),
      branchId: new mongoose.Types.ObjectId(String(branchId)),
      tableId: new mongoose.Types.ObjectId(String(tableId)),
      guestId: String(guestId),
      status: "active"
    };

    let cart: any = await Cart.findOneAndUpdate(
      cartFilter,
      {
        $setOnInsert: {
          ...cartFilter,
          items: [],
          subtotal: 0,
          tax: 0,
          total: 0,
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000)
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Clean up any historical duplicate active carts for this guest if they exist
    if (cart) {
      await Cart.deleteMany({
        _id: { $ne: cart._id },
        restaurantId: cart.restaurantId,
        branchId: cart.branchId,
        tableId: cart.tableId,
        guestId: cart.guestId,
        status: "active"
      });
    }

    const itemIndex = cart.items.findIndex((i: any) => String(i.menuId) === String(menuId));
    const targetQty = Number(qty);

    if (targetQty <= 0) {
      if (itemIndex > -1) {
        cart.items.splice(itemIndex, 1);
      }
    } else {
      if (itemIndex > -1) {
        cart.items[itemIndex].qty = targetQty;
        cart.items[itemIndex].price = menuItem.price;
        if (notes !== undefined) cart.items[itemIndex].notes = notes;
      } else {
        cart.items.push({
          menuId: menuItem._id,
          name: menuItem.name,
          qty: targetQty,
          price: menuItem.price,
          notes: notes || ""
        });
      }
    }

    // Server-side verified totals
    cart.subtotal = cart.items.reduce((acc: number, curr: any) => acc + (curr.price * curr.qty), 0);
    cart.tax = parseFloat(((cart.subtotal * taxRate) / 100).toFixed(2));
    cart.total = parseFloat((cart.subtotal + cart.tax).toFixed(2));
    cart.expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);

    await cart.save();
    sendSuccess(res, "Cart updated successfully", cart);
  } catch (error: any) {
    sendError(res, error?.message || "Failed to update cart", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * 11. Remove Item from Cart
 * DELETE /api/website/cart/item/:menuId
 */
export const removeCartItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const menuId = req.params.menuId;
    const { restaurantId, branchId, tableId, guestId } = req.query;

    if (!restaurantId || !branchId || !tableId || !guestId || !menuId) {
      sendError(res, "restaurantId, branchId, tableId, guestId, and menuId are required", StatusCodes.BAD_REQUEST);
      return;
    }

    const cart = await Cart.findOne({
      restaurantId: new mongoose.Types.ObjectId(String(restaurantId)),
      branchId: new mongoose.Types.ObjectId(String(branchId)),
      tableId: new mongoose.Types.ObjectId(String(tableId)),
      guestId: String(guestId),
      status: "active"
    });

    if (!cart) {
      sendSuccess(res, "Cart item removed", { items: [], subtotal: 0, tax: 0, total: 0 });
      return;
    }

    cart.items = cart.items.filter(i => String(i.menuId) !== String(menuId));

    const restaurant = await Restaurant.findById(restaurantId).select("defaultTaxRate");
    const taxRate = typeof restaurant?.defaultTaxRate === "number" ? restaurant.defaultTaxRate : 5;

    cart.subtotal = cart.items.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
    cart.tax = parseFloat(((cart.subtotal * taxRate) / 100).toFixed(2));
    cart.total = parseFloat((cart.subtotal + cart.tax).toFixed(2));
    cart.expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);

    await cart.save();
    sendSuccess(res, "Cart item removed successfully", cart);
  } catch (error: any) {
    sendError(res, error?.message || "Failed to remove cart item", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * 12. Clear Cart
 * POST /api/website/cart/clear
 */
export const clearCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const { restaurantId, branchId, tableId, guestId } = req.body;
    await Cart.findOneAndUpdate(
      {
        restaurantId: new mongoose.Types.ObjectId(String(restaurantId)),
        branchId: new mongoose.Types.ObjectId(String(branchId)),
        tableId: new mongoose.Types.ObjectId(String(tableId)),
        guestId: String(guestId),
        status: "active"
      },
      {
        $set: { items: [], subtotal: 0, tax: 0, total: 0, expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000) }
      }
    );
    sendSuccess(res, "Cart cleared successfully");
  } catch (error: any) {
    sendError(res, error?.message || "Failed to clear cart", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * 13. Create Customer Order (Multi-round, Idempotent, Verified Pricing & Dynamic Tax)
 * POST /api/website/orders/create
 */
export const createCustomerOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      restaurantId,
      branchId,
      tableId,
      guestId,
      items,
      cookingPreferences,
      notes,
      paymentMethod,
      idempotencyKey
    } = req.body;

    if (!restaurantId || !branchId || !tableId) {
      sendError(res, "restaurantId, branchId, and tableId are required", StatusCodes.BAD_REQUEST);
      return;
    }

    // 1. Table Verification & Session Match
    const table = await Table.findById(tableId);
    if (!table || table.isDelete) {
      sendError(res, "Table not found", StatusCodes.NOT_FOUND);
      return;
    }

    // Resolve or align active guest session on table
    let activeGuestId = guestId || table.currentGuestId;
    if (!activeGuestId) {
      const rawNum = (table.tableNumber || "T").replace(/[^a-zA-Z0-9]/g, "");
      activeGuestId = `GST-${rawNum}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    }

    if (table.currentGuestId !== activeGuestId) {
      table.currentGuestId = activeGuestId;
    }
    table.status = "Occupied";
    await table.save();

    // 2. Idempotency Check (Prevent duplicate orders on network retries)
    if (idempotencyKey) {
      const existingOrder = await Order.findOne({
        idempotencyKey,
        guestId: activeGuestId,
        restaurantId: new mongoose.Types.ObjectId(String(restaurantId))
      });
      if (existingOrder) {
        sendSuccess(res, "Order already placed (idempotent)", {
          orderId: existingOrder._id,
          orderNumber: existingOrder.orderId,
          status: existingOrder.status,
          tableName: table.tableNumber,
          subtotal: existingOrder.subtotal,
          tax: existingOrder.tax,
          total: existingOrder.total,
          createdAt: existingOrder.createdAt
        });
        return;
      }
    }

    // 3. Atomic Cart Transition (status: 'active' -> 'ordered')
    let cartItemsToOrder: any[] = [];
    const activeCart = await Cart.findOneAndUpdate(
      {
        restaurantId: new mongoose.Types.ObjectId(String(restaurantId)),
        branchId: new mongoose.Types.ObjectId(String(branchId)),
        tableId: new mongoose.Types.ObjectId(String(tableId)),
        guestId: activeGuestId,
        status: "active"
      },
      {
        $set: {
          status: "ordered",
          idempotencyKey: idempotencyKey || null,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // retain 24h for audit
        }
      },
      { new: false }
    );

    if (activeCart && activeCart.items && activeCart.items.length > 0) {
      cartItemsToOrder = activeCart.items;
    } else if (items && Array.isArray(items) && items.length > 0) {
      // Direct items fallback with Menu verification
      cartItemsToOrder = items;
    } else {
      sendError(res, "No items in cart to place order", StatusCodes.BAD_REQUEST);
      return;
    }

    // 4. Verify Every Item Price from Menu Collection (Never trust client prices)
    const formattedItems = [];
    for (const item of cartItemsToOrder) {
      const rawMenuId = item.menuId?._id || item.menuId || item._id || item.id;
      const menuItem = await Menu.findOne({
        _id: new mongoose.Types.ObjectId(String(rawMenuId)),
        restaurantId: new mongoose.Types.ObjectId(String(restaurantId)),
        isDelete: false
      });

      const verifiedPrice = menuItem ? menuItem.price : Number(item.price || 0);
      const verifiedName = menuItem ? menuItem.name : String(item.name || "Item");
      const verifiedQty = Math.max(1, Number(item.qty || item.quantity || 1));

      formattedItems.push({
        menuId: new mongoose.Types.ObjectId(String(rawMenuId)),
        name: verifiedName,
        qty: verifiedQty,
        price: verifiedPrice,
        status: "new" as const
      });
    }

    // 5. Dynamic Tax Calculation from Restaurant Setting
    const restaurant = await Restaurant.findById(restaurantId).select("defaultTaxRate");
    const taxRate = typeof restaurant?.defaultTaxRate === "number" ? restaurant.defaultTaxRate : 5;

    const subtotal = formattedItems.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
    const tax = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));

    // Combine notes with cooking preferences
    let combinedNotes = notes || "";
    if (cookingPreferences) {
      const spice = cookingPreferences.spiceLevel ? `Spice: ${cookingPreferences.spiceLevel}` : "";
      const inst = cookingPreferences.specialInstructions ? `Inst: ${cookingPreferences.specialInstructions}` : "";
      combinedNotes = [spice, inst, combinedNotes].filter(Boolean).join(" | ");
    }

    // 6. Generate Sequential Order ID Prefix (e.g. ORD-SCB-0026)
    let prefix = "ORD";
    if (branchId) {
      const branch = await Branch.findById(branchId);
      if (branch && branch.branchName) {
        const initials = branch.branchName.trim().split(/\s+/).map(w => w.charAt(0)).join("").toUpperCase();
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

    // 7. Save Order with guestId and idempotencyKey
    const newOrder = new Order({
      restaurantId: new mongoose.Types.ObjectId(String(restaurantId)),
      branchId: new mongoose.Types.ObjectId(String(branchId)),
      orderId,
      tableId: new mongoose.Types.ObjectId(String(tableId)),
      guestId: activeGuestId,
      idempotencyKey: idempotencyKey || null,
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

    // 8. Notification & Kitchen KOT Socket Emit
    const tableName = table.tableNumber || "Table";
    const notification = new Notification({
      restaurantId: new mongoose.Types.ObjectId(String(restaurantId)),
      branchId: new mongoose.Types.ObjectId(String(branchId)),
      tableId: new mongoose.Types.ObjectId(String(tableId)),
      orderId: newOrder._id,
      receiverType: "ALL",
      type: "NEW_ORDER",
      requestType: "Orders",
      title: `New Order: ${orderId}`,
      message: `${tableName} placed a new order for ${formattedItems.length} items.`
    });
    await notification.save();

    try {
      const io = getIO();
      if (io) {
        const payload = {
          _id: notification._id,
          source: "CUSTOMER_WEBSITE",
          type: "NEW_ORDER",
          requestType: "Orders",
          orderId: newOrder._id,
          orderNumber: newOrder.orderId,
          guestId: activeGuestId,
          tableId,
          tableName,
          branchId,
          order: newOrder,
          title: notification.title,
          message: notification.message,
          isRead: false,
          createdAt: notification.createdAt || new Date()
        };
        io.to(`room_branch_${branchId}`).emit("new_order", payload);
        io.to(`room_branch_${branchId}`).emit("admin_notification", payload);
        io.to(`room_restaurant_${restaurantId}`).emit("admin_notification", payload);
      }
    } catch (err: any) {
      console.warn("Socket notification warning:", err);
    }

    sendSuccess(res, "Order placed successfully!", {
      orderId: newOrder._id,
      orderNumber: newOrder.orderId,
      guestId: activeGuestId,
      status: newOrder.status,
      tableName,
      subtotal: newOrder.subtotal,
      tax: newOrder.tax,
      total: newOrder.total,
      createdAt: newOrder.createdAt
    }, StatusCodes.CREATED);
  } catch (error: any) {
    console.error("Error in createCustomerOrder:", error);
    sendError(res, error?.message || "Failed to create order", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

