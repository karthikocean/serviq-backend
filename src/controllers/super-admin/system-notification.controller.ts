import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import SystemNotification from "../../models/SystemNotification";
import Ticket from "../../models/Ticket";
import { sendSuccess, sendError } from "../../utils/response";
import { pagination } from "../../utils/pagination";

export const getAllNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 0;
        const limit = parseInt(req.query.limit as string) || 10;
        const pageIndex = Math.max(0, page);
        const skip = pageIndex * limit;

        const query: any = {};
        const search = req.query.search as string;

        if (req.query.filterType && req.query.filterType !== 'All' && req.query.filterType !== 'All Types') {
            query.type = req.query.filterType;
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { message: { $regex: search, $options: "i" } }
            ];
        }

        const total = await SystemNotification.countDocuments(query);
        const notifications = await SystemNotification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

        pagination(total, notifications, limit, pageIndex, res, "Notifications fetched successfully.");
    } catch (error: any) {
        sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const getSuperAdminHeaderNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
        const typeFilter = req.query.type
            ? String(req.query.type).trim().toLowerCase()
            : (req.query.filterType ? String(req.query.filterType).trim().toLowerCase() : (req.query.tab ? String(req.query.tab).trim().toLowerCase() : "all"));

        // 1. Fetch System Notifications (Alerts)
        const sysNotifs = await SystemNotification.find({}).sort({ createdAt: -1 }).lean();
        const alertNotifications = sysNotifs.map((sys: any) => ({
            _id: sys._id,
            source: "SYSTEM_NOTIFICATION",
            type: "Alerts",
            category: "Alerts",
            title: sys.subject,
            message: sys.body,
            status: sys.status,
            isRead: Boolean(sys.isReadBySuperAdmin),
            createdAt: sys.createdAt
        }));

        // 2. Fetch Ticket Notifications
        const ticketDocs = await Ticket.find({}).sort({ createdAt: -1 }).lean();
        const ticketNotifications = ticketDocs.map((t: any) => ({
            _id: t._id,
            source: "TICKET",
            type: "Tickets",
            category: "Tickets",
            ticketNumber: t.ticketNumber,
            title: `${t.ticketNumber} ${t.subject}`,
            message: t.description,
            restaurantName: t.restaurantName || "Restaurant",
            status: t.status,
            isRead: Boolean(t.isReadBySuperAdmin),
            createdAt: t.createdAt
        }));

        // 3. Combine and compute counts
        const allNotifications = [...alertNotifications, ...ticketNotifications].sort(
            (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const unreadAlerts = alertNotifications.filter((n: any) => !n.isRead).length;
        const unreadTickets = ticketNotifications.filter((n: any) => !n.isRead).length;
        const totalUnread = unreadAlerts + unreadTickets;

        const counts = {
            all: allNotifications.length,
            alerts: alertNotifications.length,
            tickets: ticketNotifications.length,
            unread: totalUnread
        };

        // 4. Filter by requested type / tab
        let filteredNotifications = [...allNotifications];
        if (typeFilter === "alerts" || typeFilter === "alert") {
            filteredNotifications = alertNotifications;
        } else if (typeFilter === "tickets" || typeFilter === "ticket") {
            filteredNotifications = ticketNotifications;
        } else if (typeFilter === "unread") {
            filteredNotifications = allNotifications.filter((n: any) => !n.isRead);
        }

        // Pagination if requested
        const page = req.query.page !== undefined ? parseInt(req.query.page as string) : undefined;
        const limit = req.query.limit !== undefined ? parseInt(req.query.limit as string) : undefined;
        let result = filteredNotifications;

        if (page !== undefined && limit !== undefined && !isNaN(page) && !isNaN(limit) && limit > 0) {
            const skip = Math.max(0, page) * limit;
            result = filteredNotifications.slice(skip, skip + limit);
        }

        sendSuccess(res, "Super Admin notifications fetched successfully.", {
            counts,
            unreadCount: totalUnread,
            notifications: result,
            alerts: alertNotifications,
            tickets: ticketNotifications
        });
    } catch (error: any) {
        console.error("Super Admin Notifications Error:", error);
        sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const markNotificationAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        if (!id) {
            sendError(res, "Notification ID is required.", StatusCodes.BAD_REQUEST);
            return;
        }

        // Check if ticket
        const ticket = await Ticket.findById(id);
        if (ticket) {
            ticket.isReadBySuperAdmin = true;
            await ticket.save();
            sendSuccess(res, "Ticket notification marked as read.", ticket);
            return;
        }

        // Check if system notification
        const sysNotif = await SystemNotification.findById(id);
        if (sysNotif) {
            sysNotif.isReadBySuperAdmin = true;
            await sysNotif.save();
            sendSuccess(res, "System notification marked as read.", sysNotif);
            return;
        }

        sendError(res, "Notification not found.", StatusCodes.NOT_FOUND);
    } catch (error: any) {
        sendError(res, error?.message || "Failed to mark notification as read.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const markAllNotificationsAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
        await Ticket.updateMany({ isReadBySuperAdmin: false }, { isReadBySuperAdmin: true });
        await SystemNotification.updateMany({ isReadBySuperAdmin: false }, { isReadBySuperAdmin: true });

        sendSuccess(res, "All super admin notifications marked as read.");
    } catch (error: any) {
        sendError(res, error?.message || "Failed to mark all notifications as read.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

import { getIO } from "../../socket";
import Subscription from "../../models/Subscription";

export const broadcastSystemNotificationSocket = async (notification: any) => {
    try {
        const io = getIO();
        if (!io) return;

        const payload = {
            _id: notification._id,
            source: "SUPER_ADMIN",
            type: notification.type || "SYSTEM_NOTIFICATION",
            subject: notification.subject,
            body: notification.body,
            targetType: notification.targetType,
            status: notification.status,
            createdAt: notification.createdAt || new Date()
        };

        if (notification.targetType === "ALL") {
            io.to("room_all").emit("superadmin_notification", payload);
            io.to("room_all").emit("admin_notification", payload);
        } else if (notification.targetType === "RESTAURANT") {
            for (const restId of notification.targetRestaurants || []) {
                const rStr = restId.toString();
                io.to(`room_restaurant_${rStr}`).emit("superadmin_notification", payload);
                io.to(`room_restaurant_${rStr}`).emit("admin_notification", payload);
            }
        } else if (notification.targetType === "PLAN" && notification.targetPlan) {
            const activeSubs = await Subscription.find({ plan: notification.targetPlan, status: "Active" });
            for (const sub of activeSubs) {
                if (sub.restaurant) {
                    const rStr = sub.restaurant.toString();
                    io.to(`room_restaurant_${rStr}`).emit("superadmin_notification", payload);
                    io.to(`room_restaurant_${rStr}`).emit("admin_notification", payload);
                }
            }
        }
    } catch (err: any) {
        console.warn("Error broadcasting system notification socket:", err);
    }
};

export const getNotificationById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const ntf = await SystemNotification.findById(id).populate("targetPlan").populate("targetRestaurants").lean();
        if (!ntf) {
            sendError(res, "Notification not found.", StatusCodes.NOT_FOUND);
            return;
        }
        sendSuccess(res, "Notification details fetched successfully.", ntf);
    } catch (error: any) {
        sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const createNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const { subject, type, targetType, targetPlan, targetRestaurants, body, isScheduled, scheduledDate, scheduledTime, deliveryOption, status: reqStatus } = req.body;

        if (!subject || !body || !targetType) {
            sendError(res, "Subject, body, and target type are required.", StatusCodes.BAD_REQUEST);
            return;
        }

        if (targetType === 'PLAN' && !targetPlan) {
            sendError(res, "Target plan is required when targeting by plan.", StatusCodes.BAD_REQUEST);
            return;
        }

        let status = reqStatus || 'Sent';
        if (deliveryOption) {
            const opt = String(deliveryOption).trim().toLowerCase();
            if (opt === 'now' || opt === 'broadcast' || opt === 'sent') status = 'Sent';
            else if (opt === 'schedule' || opt === 'scheduled') status = 'Scheduled';
            else if (opt === 'draft' || opt === 'savedraft' || opt === 'save draft') status = 'Draft';
        } else if (isScheduled && status !== 'Draft') {
            status = 'Scheduled';
        }

        const newNtf = new SystemNotification({
            subject,
            type: type || 'Subscription Expiry',
            targetType,
            targetPlan: targetType === 'PLAN' ? targetPlan : null,
            targetRestaurants: targetType === 'RESTAURANT' ? (targetRestaurants || []) : [],
            body,
            isScheduled: Boolean(isScheduled),
            scheduledDate: scheduledDate || '',
            scheduledTime: scheduledTime || '',
            status
        });

        await newNtf.save();
        
        if (status === 'Sent') {
            await broadcastSystemNotificationSocket(newNtf);
        }
        
        sendSuccess(res, "Notification created successfully.", newNtf, StatusCodes.CREATED);
    } catch (error: any) {
        sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const updateNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { subject, type, targetType, targetPlan, targetRestaurants, body, isScheduled, scheduledDate, scheduledTime, deliveryOption, status: reqStatus } = req.body;

        const ntf = await SystemNotification.findById(id);
        if (!ntf) {
            sendError(res, "Notification not found.", StatusCodes.NOT_FOUND);
            return;
        }

        if (subject) ntf.subject = subject;
        if (type) ntf.type = type;
        if (targetType) {
            ntf.targetType = targetType;
            if (targetType === 'PLAN') {
                ntf.targetPlan = targetPlan || null;
                ntf.targetRestaurants = [];
            } else if (targetType === 'RESTAURANT') {
                ntf.targetRestaurants = targetRestaurants || [];
                ntf.targetPlan = null;
            } else if (targetType === 'ALL') {
                ntf.targetPlan = null;
                ntf.targetRestaurants = [];
            }
        } else {
            if (targetPlan !== undefined) ntf.targetPlan = targetPlan;
            if (targetRestaurants !== undefined) ntf.targetRestaurants = targetRestaurants;
        }

        if (body) ntf.body = body;
        if (isScheduled !== undefined) ntf.isScheduled = Boolean(isScheduled);
        if (scheduledDate !== undefined) ntf.scheduledDate = scheduledDate;
        if (scheduledTime !== undefined) ntf.scheduledTime = scheduledTime;

        let status = reqStatus || ntf.status;
        if (deliveryOption) {
            const opt = String(deliveryOption).trim().toLowerCase();
            if (opt === 'now' || opt === 'broadcast' || opt === 'sent') status = 'Sent';
            else if (opt === 'schedule' || opt === 'scheduled') status = 'Scheduled';
            else if (opt === 'draft' || opt === 'savedraft' || opt === 'save draft') status = 'Draft';
        } else if (isScheduled && status !== 'Draft') {
            status = 'Scheduled';
        }
        ntf.status = status;

        await ntf.save();

        if (status === 'Sent') {
            await broadcastSystemNotificationSocket(ntf);
        }

        sendSuccess(res, "Notification updated successfully.", ntf);
    } catch (error: any) {
        sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const cancelNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const ntf = await SystemNotification.findById(id);
        if (!ntf) {
            sendError(res, "Notification not found.", StatusCodes.NOT_FOUND);
            return;
        }

        ntf.status = 'Cancelled';
        await ntf.save();

        sendSuccess(res, "Notification cancelled.", ntf);
    } catch (error: any) {
        sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const sendDraftNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const ntf = await SystemNotification.findById(id);
        if (!ntf) {
            sendError(res, "Notification not found.", StatusCodes.NOT_FOUND);
            return;
        }

        ntf.status = 'Sent';
        await ntf.save();

        await broadcastSystemNotificationSocket(ntf);

        sendSuccess(res, "Notification sent.", ntf);
    } catch (error: any) {
        sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        await SystemNotification.findByIdAndDelete(id);
        sendSuccess(res, "Notification deleted.");
    } catch (error: any) {
        sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
    }
};
