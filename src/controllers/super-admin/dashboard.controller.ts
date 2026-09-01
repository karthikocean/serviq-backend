import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { getDashboardMetrics } from "../../services/super-admin/dashboard.service";

export const getMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
        const metrics = await getDashboardMetrics();
        sendSuccess(res, "Dashboard metrics fetched successfully.", metrics);
    } catch (error: any) {
        console.error("Error in getMetrics:", error);
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const getReportsAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
        const { getReportsAnalyticsData } = await import("../../services/super-admin/dashboard.service");
        const analytics = await getReportsAnalyticsData();
        sendSuccess(res, "Reports analytics fetched successfully.", analytics);
    } catch (error: any) {
        console.error("Error in getReportsAnalytics:", error);
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};
