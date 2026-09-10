import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/authMiddleware";
import SystemNotification from "../../models/SystemNotification";
import Notification from "../../models/Notification";
import Subscription from "../../models/Subscription";

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      sendError(res, "Restaurant context missing.", StatusCodes.UNAUTHORIZED);
      return;
    }

    const restObjId = new mongoose.Types.ObjectId(String(restaurantId));

    // 1. Fetch Customer Website Notifications (Orders, Table Quick Help: Water, Bill, Message)
    const customerDbNotifs = await Notification.find({
      restaurantId: restObjId,
      isDelete: false
    })
      .populate("tableId", "tableNumber section")
      .populate("branchId", "branchName city")
      .sort({ createdAt: -1 })
      .lean();

    const customerWebsiteNotifications = customerDbNotifs.map((n: any) => {
      let reqType = n.requestType;
      if (!reqType) {
        if (n.type === "NEW_ORDER") reqType = "Orders";
        else if (n.title?.toLowerCase().includes("water")) reqType = "Water";
        else if (n.title?.toLowerCase().includes("bill")) reqType = "Bill";
        else if (n.title?.toLowerCase().includes("message") || n.message?.includes("Chutney") || n.message?.includes("napkin")) reqType = "Message";
        else reqType = "General";
      }

      return {
        _id: n._id,
        source: "CUSTOMER_WEBSITE",
        type: n.type,
        requestType: reqType,
        title: n.title,
        message: n.message,
        table: n.tableId ? {
          _id: n.tableId._id,
          tableNumber: n.tableId.tableNumber || "Table",
          section: n.tableId.section || "Main"
        } : null,
        branch: n.branchId ? {
          _id: n.branchId._id,
          branchName: n.branchId.branchName || "Main Branch"
        } : null,
        orderId: n.orderId || null,
        isRead: Boolean(n.isRead),
        createdAt: n.createdAt
      };
    });

    // 2. Fetch SuperAdmin System Notifications
    const activeSubscription = await Subscription.findOne({
      restaurant: restObjId,
      status: "Active"
    });
    const activePlanId = activeSubscription ? activeSubscription.plan : null;

    const targetConditions: any[] = [
      { targetType: "ALL" },
      { targetType: "RESTAURANT", targetRestaurants: restObjId }
    ];
    if (activePlanId) {
      targetConditions.push({ targetType: "PLAN", targetPlan: activePlanId });
    }

    const superAdminDbNotifs = await SystemNotification.find({
      status: "Sent",
      $or: targetConditions
    })
      .sort({ createdAt: -1 })
      .lean();

    const superAdminNotifications = superAdminDbNotifs.map((sys: any) => {
      const readBy = sys.readByRestaurants || [];
      const isRead = readBy.some((id: any) => id.toString() === restaurantId.toString());

      return {
        _id: sys._id,
        source: "SUPER_ADMIN",
        type: sys.type || "SYSTEM_NOTIFICATION",
        requestType: "SuperAdmin",
        title: sys.subject,
        message: sys.body,
        status: sys.status,
        isRead,
        createdAt: sys.createdAt
      };
    });

    // 3. Compute Counts
    const unreadCustomer = customerWebsiteNotifications.filter((n: any) => !n.isRead).length;
    const unreadSuperAdmin = superAdminNotifications.filter((n: any) => !n.isRead).length;

    const ordersCount = customerWebsiteNotifications.filter((n: any) => n.requestType === "Orders" || n.type === "NEW_ORDER").length;
    const waterCount = customerWebsiteNotifications.filter((n: any) => n.requestType?.toLowerCase() === "water").length;
    const billCount = customerWebsiteNotifications.filter((n: any) => n.requestType?.toLowerCase() === "bill").length;
    const messageCount = customerWebsiteNotifications.filter((n: any) => n.requestType?.toLowerCase() === "message").length;

    const counts = {
      totalActive: unreadCustomer + unreadSuperAdmin,
      totalCount: customerWebsiteNotifications.length + superAdminNotifications.length,
      customerWebsite: customerWebsiteNotifications.length,
      customerWebsiteUnread: unreadCustomer,
      superAdmin: superAdminNotifications.length,
      superAdminUnread: unreadSuperAdmin,
      quickHelp: {
        orders: ordersCount,
        water: waterCount,
        bill: billCount,
        message: messageCount
      }
    };

    // Combined sorted notifications
    const allNotifications = [...customerWebsiteNotifications, ...superAdminNotifications].sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // 4. Query Parameter Filtering (`type` / `tab` & `requestType`)
    const typeParam = req.query.type ? String(req.query.type).trim().toLowerCase() : (req.query.tab ? String(req.query.tab).trim().toLowerCase() : "all");
    const subTypeParam = req.query.requestType ? String(req.query.requestType).trim().toLowerCase() : (req.query.subType ? String(req.query.subType).trim().toLowerCase() : "all");

    let filteredNotifications = [...allNotifications];

    if (typeParam === "customer" || typeParam === "customer_website" || typeParam === "customer-website") {
      filteredNotifications = filteredNotifications.filter((n: any) => n.source === "CUSTOMER_WEBSITE");
    } else if (typeParam === "superadmin" || typeParam === "super_admin" || typeParam === "super-admin") {
      filteredNotifications = filteredNotifications.filter((n: any) => n.source === "SUPER_ADMIN");
    }

    if (subTypeParam && subTypeParam !== "all") {
      filteredNotifications = filteredNotifications.filter((n: any) => {
        const reqT = (n.requestType || "").toLowerCase();
        const t = (n.type || "").toLowerCase();
        return reqT === subTypeParam || t === subTypeParam;
      });
    }

    sendSuccess(res, "Admin notifications fetched successfully.", {
      counts,
      notifications: filteredNotifications,
      customerWebsiteNotifications,
      superAdminNotifications,
      allNotifications
    });
  } catch (error: any) {
    console.error("Admin Notifications Error:", error);
    sendError(res, "Failed to fetch notifications.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const restaurantId = req.user?.restaurantId;

    if (!id) {
      sendError(res, "Notification ID is required.", StatusCodes.BAD_REQUEST);
      return;
    }

    // Try finding customer website notification first
    const notif = await Notification.findById(id);
    if (notif) {
      notif.isRead = true;
      await notif.save();
      sendSuccess(res, "Notification marked as read.", notif);
      return;
    }

    // Try system notification
    const sysNotif = await SystemNotification.findById(id);
    if (sysNotif && restaurantId) {
      const restObjId = new mongoose.Types.ObjectId(String(restaurantId));
      if (!sysNotif.readByRestaurants.some((rId: any) => rId.toString() === restObjId.toString())) {
        sysNotif.readByRestaurants.push(restObjId);
        await sysNotif.save();
      }
      sendSuccess(res, "SuperAdmin notification marked as read.", sysNotif);
      return;
    }

    sendError(res, "Notification not found.", StatusCodes.NOT_FOUND);
  } catch (error: any) {
    sendError(res, "Failed to mark notification as read.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const clearAllNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      sendError(res, "Restaurant context missing.", StatusCodes.UNAUTHORIZED);
      return;
    }

    const restObjId = new mongoose.Types.ObjectId(String(restaurantId));

    // Mark all customer website notifications as read & deleted for this restaurant
    await Notification.updateMany(
      { restaurantId: restObjId, isDelete: false },
      { isRead: true, isDelete: true }
    );

    // Mark all system notifications as read for this restaurant
    await SystemNotification.updateMany(
      { readByRestaurants: { $ne: restObjId } },
      { $push: { readByRestaurants: restObjId } }
    );

    sendSuccess(res, "All active notifications cleared successfully.");
  } catch (error: any) {
    sendError(res, "Failed to clear notifications.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getAdminNotifications = getNotifications;
