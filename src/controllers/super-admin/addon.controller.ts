import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Addon from "../../models/Addon";
import { sendSuccess, sendError } from "../../utils/response";

export const createAddon = async (req: Request, res: Response): Promise<void> => {
    try {
        const { addonName, addonType, monthlyPrice, annualPrice, isActive } = req.body;

        const newAddon = await Addon.create({
            addonName,
            addonType: addonType || "BRANCH",
            monthlyPrice,
            annualPrice,
            isActive
        });

        sendSuccess(res, "Addon created successfully", newAddon, StatusCodes.CREATED);
    } catch (error) {
        console.error("Create Addon Error:", error);
        sendError(res, "Internal server error", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const getAllAddons = async (req: Request, res: Response): Promise<void> => {
    try {
        const addons = await Addon.find({ isDelete: false }).sort({ createdAt: -1 });
        sendSuccess(res, "Addons fetched successfully", addons);
    } catch (error) {
        console.error("Fetch Addons Error:", error);
        sendError(res, "Internal server error", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const updateAddon = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updatedAddon = await Addon.findByIdAndUpdate(id, req.body, { new: true });

        if (!updatedAddon) {
            sendError(res, "Addon not found", StatusCodes.NOT_FOUND);
            return;
        }

        sendSuccess(res, "Addon updated successfully", updatedAddon);
    } catch (error) {
        console.error("Update Addon Error:", error);
        sendError(res, "Internal server error", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const deleteAddon = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const addon = await Addon.findByIdAndUpdate(id, { isDelete: true }, { new: true });

        if (!addon) {
            sendError(res, "Addon not found", StatusCodes.NOT_FOUND);
            return;
        }

        sendSuccess(res, "Addon deleted successfully", null);
    } catch (error) {
        console.error("Delete Addon Error:", error);
        sendError(res, "Internal server error", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};
