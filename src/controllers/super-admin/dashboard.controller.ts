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
