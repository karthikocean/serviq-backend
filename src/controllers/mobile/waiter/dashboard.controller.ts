import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import Order from "../../../models/Order";
import Table from "../../../models/Table";
import User from "../../../models/User";
import Notification from "../../../models/Notification";
import { AuthRequest } from "../../../middleware/authMiddleware";
import { sendSuccess, sendError } from "../../../utils/response";

/**
 * Format relative elapsed time into human readable string like "43h 56m ago" or "5m ago"
 */
const formatTimeAgo = (date?: Date | string): string => {
  if (!date) return "Just now";
  const diffMs = Math.max(0, Date.now() - new Date(date).getTime());
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffHour >= 1) {
    const remainingMins = diffMin % 60;
    return `${diffHour}h ${remainingMins}m ago`;
  }
  if (diffMin > 0) {
    return `${diffMin}m ago`;
  }
  return "Just now";
};

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const activeBranchId = req.user?.activeBranchId;
    const userId = req.user?.userId;

    if (!restaurantId || !activeBranchId || !userId) {
      sendError(res, "Unauthorized: Waiter context missing", StatusCodes.UNAUTHORIZED);
      return;
    }

    const restObjId = mongoose.Types.ObjectId.isValid(restaurantId) 
      ? new mongoose.Types.ObjectId(restaurantId) 
      : restaurantId;
    const branchObjId = mongoose.Types.ObjectId.isValid(activeBranchId) 
      ? new mongoose.Types.ObjectId(activeBranchId) 
      : activeBranchId;
    const userObjId = mongoose.Types.ObjectId.isValid(userId) 
      ? new mongoose.Types.ObjectId(userId) 
      : userId;

    // 1. Fetch Waiter User Profile
    const user = await User.findById(userObjId).select("name email phoneNumber profileImage dutyStatus");

    // Dynamic Greeting
    const hour = new Date().getHours();
    let greeting = "Good Evening";
    if (hour < 12) {
      greeting = "Good Morning";
    } else if (hour < 17) {
      greeting = "Good Afternoon";
    }

    // Unread Notifications count for Waiter bell icon
    const unreadNotificationsCount = await Notification.countDocuments({
      restaurantId: restObjId,
      branchId: branchObjId,
      receiverType: "WAITER",
      $or: [
        { receiverId: userObjId },
        { receiverId: null }
      ],
      isRead: false,
      isDelete: false
    });

    // 2. Today's Sales & Trend vs Yesterday
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const endOfYesterday = new Date(startOfToday);
    endOfYesterday.setMilliseconds(-1);

    // Sales by this waiter today
    const myTodayOrders = await Order.find({
      restaurantId: restObjId,
      branchId: branchObjId,
      waiterId: userObjId,
      createdAt: { $gte: startOfToday },
      isDelete: false,
      $or: [{ status: "completed" }, { billingStatus: "paid" }]
    }).select("total");
    const myTodaySales = myTodayOrders.reduce((acc, curr) => acc + (curr.total || 0), 0);

    // Total branch sales today
    const branchTodayOrders = await Order.find({
      restaurantId: restObjId,
      branchId: branchObjId,
      createdAt: { $gte: startOfToday },
      isDelete: false,
      $or: [{ status: "completed" }, { billingStatus: "paid" }]
    }).select("total");
    const branchTodaySales = branchTodayOrders.reduce((acc, curr) => acc + (curr.total || 0), 0);

    // Waiter's sales yesterday
    const myYesterdayOrders = await Order.find({
      restaurantId: restObjId,
      branchId: branchObjId,
      waiterId: userObjId,
      createdAt: { $gte: startOfYesterday, $lte: endOfYesterday },
      isDelete: false,
      $or: [{ status: "completed" }, { billingStatus: "paid" }]
    }).select("total");
    const myYesterdaySales = myYesterdayOrders.reduce((acc, curr) => acc + (curr.total || 0), 0);

    const todaySales = myTodaySales;
    const yesterdaySales = myYesterdaySales;

    let percentageChange = 0;
    if (yesterdaySales > 0) {
      percentageChange = Number((((todaySales - yesterdaySales) / yesterdaySales) * 100).toFixed(1));
    }
    const salesPercentageChange = (percentageChange >= 0 ? "+" : "") + percentageChange.toFixed(1) + "%";

    // 3. Needs Attention Section
    const [readyOrders, attentionNotifications] = await Promise.all([
      Order.find({
        restaurantId: restObjId,
        branchId: branchObjId,
        status: "ready",
        isDelete: false
      }).populate("tableId", "tableNumber").limit(5),
      Notification.find({
        restaurantId: restObjId,
        branchId: branchObjId,
        receiverType: "WAITER",
        $or: [{ receiverId: userObjId }, { receiverId: null }],
        isRead: false,
        isDelete: false
      }).populate("tableId", "tableNumber").sort({ createdAt: -1 }).limit(5)
    ]);

    const attentionItems: any[] = [];
    readyOrders.forEach(o => {
      const tblNum = (o.tableId as any)?.tableNumber || o.orderType || "Table";
      attentionItems.push({
        id: o._id.toString(),
        type: "FOOD_READY",
        title: `Order #${o.orderId?.slice(-4) || o._id.toString().slice(-4)} Ready`,
        message: `Food ready to serve for ${tblNum}`,
        tableNumber: tblNum,
        timeAgo: formatTimeAgo(o.updatedAt || o.createdAt)
      });
    });

    attentionNotifications.forEach(n => {
      const tblNum = (n.tableId as any)?.tableNumber || "Table";
      attentionItems.push({
        id: n._id.toString(),
        type: n.type || "CALL_WAITER",
        title: n.title || "Assistance Needed",
        message: n.message || `Customer requested assistance at ${tblNum}`,
        tableNumber: tblNum,
        timeAgo: formatTimeAgo(n.createdAt)
      });
    });

    const needsAttention = {
      count: attentionItems.length,
      message: attentionItems.length === 0
        ? "All caught up! Service running smoothly."
        : `${attentionItems.length} task${attentionItems.length > 1 ? "s" : ""} need${attentionItems.length === 1 ? "s" : ""} attention`,
      items: attentionItems
    };

    // 4. Horizontal Status Metrics (Free, Seated, Cooking, Ready, Billing)
    const [tablesInBranch, cookingCount, readyCount, billingOrdersCount] = await Promise.all([
      Table.find({
        restaurantId: restObjId,
        branchId: branchObjId,
        isDelete: false,
        isActive: true
      }).select("status tableNumber assignedWaiter coverWaiter"),
      Order.countDocuments({
        restaurantId: restObjId,
        branchId: branchObjId,
        status: "preparing",
        isDelete: false
      }),
      Order.countDocuments({
        restaurantId: restObjId,
        branchId: branchObjId,
        status: "ready",
        isDelete: false
      }),
      Order.countDocuments({
        restaurantId: restObjId,
        branchId: branchObjId,
        billingStatus: "unpaid",
        status: "served",
        isDelete: false
      })
    ]);

    let freeCount = 0;
    let seatedCount = 0;
    let tableBilledCount = 0;

    tablesInBranch.forEach(t => {
      const s = String(t.status || "").toLowerCase().trim();
      if (s === "available" || s === "free") {
        freeCount++;
      } else if (s === "occupied" || s === "seated") {
        seatedCount++;
      } else if (s === "billed") {
        tableBilledCount++;
      }
    });

    const billingCount = Math.max(tableBilledCount, billingOrdersCount);

    const metrics = {
      free: freeCount,
      seated: seatedCount,
      cooking: cookingCount,
      ready: readyCount,
      billing: billingCount,
      freeFormatted: String(freeCount).padStart(2, "0"),
      seatedFormatted: String(seatedCount).padStart(2, "0"),
      cookingFormatted: String(cookingCount).padStart(2, "0"),
      readyFormatted: String(readyCount).padStart(2, "0"),
      billingFormatted: String(billingCount).padStart(2, "0")
    };

    // 5. My Active Tables Section
    const assignedTableIds = tablesInBranch
      .filter((t: any) => t.assignedWaiter?.toString() === userId || t.coverWaiter?.toString() === userId)
      .map(t => t._id);

    const activeOrderQuery: any = {
      restaurantId: restObjId,
      branchId: branchObjId,
      status: { $nin: ["completed", "cancelled"] },
      isDelete: false
    };

    // Orders assigned to waiter, on waiter's tables, or unassigned in this branch
    const activeOrders = await Order.find({
      ...activeOrderQuery,
      $or: [
        { waiterId: userObjId },
        ...(assignedTableIds.length > 0 ? [{ tableId: { $in: assignedTableIds } }] : []),
        { waiterId: null },
        { waiterId: { $exists: false } }
      ]
    })
      .populate("tableId", "tableNumber section seatingCapacity")
      .sort({ createdAt: -1 });

    const ordersToUse = activeOrders.length > 0 ? activeOrders : await Order.find(activeOrderQuery)
      .populate("tableId", "tableNumber section seatingCapacity")
      .sort({ createdAt: -1 });

    const activeTablesList = ordersToUse.map(order => {
      const table = order.tableId as any;
      let tableNum = "";
      if (table?.tableNumber) {
        tableNum = table.tableNumber;
        if (tableNum.startsWith("TBL-")) {
          tableNum = tableNum.replace("TBL-", "T-");
        }
      } else if (order.orderType) {
        tableNum = order.orderType;
      } else {
        tableNum = "Counter";
      }

      // Hex ref matching screenshot format like "#b326"
      const hexRef = `#${order._id.toString().slice(-4)}`;
      const itemCount = (order.items || []).reduce((acc: number, it: any) => acc + (it.qty || 1), 0) || (order.items?.length || 1);
      
      const rawStatus = String(order.status || "new").toLowerCase();
      const statusMap: Record<string, string> = {
        new: "New",
        preparing: "Cooking",
        ready: "Ready",
        served: "Served"
      };

      const numericTotal = Number(order.total || 0);
      const displayTotal = numericTotal % 1 === 0 ? numericTotal : Number(numericTotal.toFixed(2));

      return {
        id: order._id.toString(),
        _id: order._id.toString(),
        orderId: order.orderId,
        orderNumber: order.orderId,
        orderRef: hexRef,
        tableId: table ? table._id.toString() : null,
        tableNumber: tableNum,
        table: tableNum,
        tableName: table ? `Table ${table.tableNumber}` : tableNum,
        section: table?.section || "Main",
        status: order.status,
        statusLabel: statusMap[rawStatus] || "New",
        itemCount: itemCount,
        itemsCount: itemCount,
        itemsText: `${itemCount} items`,
        timeAgo: formatTimeAgo(order.createdAt),
        total: displayTotal,
        totalAmount: displayTotal,
        amount: displayTotal,
        formattedTotal: `₹${displayTotal}`,
        orderType: order.orderType || (table ? "Dine-In" : "Takeaway"),
        customerName: order.customerName || "",
        customerPhone: order.customerPhone || "",
        items: (order.items || []).map((it: any) => ({
          name: it.name,
          qty: it.qty,
          price: it.price,
          status: it.status
        })),
        createdAt: order.createdAt
      };
    });

    sendSuccess(res, "Waiter dashboard fetched successfully", {
      waiter: {
        id: user?._id || userId,
        name: user?.name || "Deepan",
        email: user?.email || "",
        phoneNumber: user?.phoneNumber || "",
        profileImage: user?.profileImage || null,
        dutyStatus: user?.dutyStatus || "ON_DUTY"
      },
      greeting: `${greeting},`,
      waiterName: user?.name || "Deepan",
      name: user?.name || "Deepan",
      profileImage: user?.profileImage || null,
      unreadNotificationsCount,
      todaySales,
      branchTodaySales,
      formattedTodaySales: `₹${todaySales}`,
      salesPercentage: percentageChange,
      salesPercentageChange,
      vsYesterdayLabel: "vs Yesterday",
      yesterdaySales,
      salesTrend: percentageChange >= 0 ? "up" : "down",
      needsAttention,
      metrics,
      // Flat metric fields for direct access
      free: metrics.free,
      seated: metrics.seated,
      cooking: metrics.cooking,
      ready: metrics.ready,
      billing: metrics.billing,
      freeFormatted: metrics.freeFormatted,
      seatedFormatted: metrics.seatedFormatted,
      cookingFormatted: metrics.cookingFormatted,
      readyFormatted: metrics.readyFormatted,
      billingFormatted: metrics.billingFormatted,
      activeTablesCount: activeTablesList.length,
      myActiveTables: activeTablesList,
      activeTables: activeTablesList,
      activeOrders: activeTablesList,
      totalOrders: branchTodayOrders.length
    });
  } catch (error: any) {
    console.error("Waiter Dashboard Error:", error);
    sendError(
      res,
      error?.message || "Failed to fetch dashboard stats",
      error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};
