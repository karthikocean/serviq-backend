import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import SystemNotification from "../../models/SystemNotification";
import { sendSuccess, sendError } from "../../utils/response";
import { pagination } from "../../utils/pagination";

export const getAllNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 0;
        const limit = parseInt(req.query.limit as string) || 10;
        const pageIndex = Math.max(0, page);
        const skip = pageIndex * limit;

        const query: any = {};

        if (req.query.filterType && req.query.filterType !== 'All' && req.query.filterType !== 'All Types') {
            query.type = req.query.filterType;
        }

        const total = await SystemNotification.countDocuments(query);
        const notifications = await SystemNotification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

        pagination(total, notifications, limit, pageIndex, res, "Notifications fetched successfully.");
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const createNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const { subject, type, targetType, targetPlan, targetRestaurants, body, isScheduled, scheduledDate, scheduledTime } = req.body;

        if (!subject || !body || !targetType) {
            sendError(res, "Subject, body, and target type are required.", StatusCodes.BAD_REQUEST);
            return;
        }

        if (targetType === 'PLAN' && !targetPlan) {
            sendError(res, "Target plan is required when targeting by plan.", StatusCodes.BAD_REQUEST);
            return;
        }

        let status = 'Draft';
        if (isScheduled) {
            status = 'Scheduled';
        }

        const newNtf = new SystemNotification({
            subject, type, targetType, targetPlan: targetType === 'PLAN' ? targetPlan : null, targetRestaurants: targetType === 'RESTAURANT' ? targetRestaurants : [], body, isScheduled, scheduledDate, scheduledTime, status
        });

        await newNtf.save();
        
        // Future Implementation: Actual dispatch of notification (Email, SMS, Push) via external providers
        
        sendSuccess(res, "Notification created successfully.", newNtf, StatusCodes.CREATED);
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
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
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
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

        // Future Implementation: Trigger dispatch logic here

        sendSuccess(res, "Notification sent.", ntf);
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        await SystemNotification.findByIdAndDelete(id);
        sendSuccess(res, "Notification deleted.");
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};
