import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Setting from "../../models/Setting";
import { sendSuccess, sendError } from "../../utils/response";

// Get Global Settings (Assuming a single document)
export const getSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        let settings = await Setting.findOne();
        if (!settings) {
            // Create default settings if not exists
            settings = new Setting({
                name: 'Serviq Super',
                legalName: 'Serviq Solutions Pvt Ltd',
                email: 'support@serviq.com',
                phone: '9876543210'
            });
            await settings.save();
        }
        
        sendSuccess(res, "Settings fetched successfully.", settings);
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// Update Global Settings
export const updateSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, legalName, email, phone } = req.body;

        let settings = await Setting.findOne();

        if (settings) {
            settings.name = name || settings.name;
            settings.legalName = legalName || settings.legalName;
            settings.email = email || settings.email;
            settings.phone = phone || settings.phone;
            await settings.save();
            sendSuccess(res, "Settings updated successfully.", settings);
        } else {
            sendError(res, "Settings not found.", StatusCodes.NOT_FOUND);
        }
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};
