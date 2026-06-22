import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/authMiddleware";
import Table from "../../models/Table";
import QrCode from "../../models/QrCode";

export const createTable = async (req: AuthRequest, res: Response): Promise<void> => {
    const { tableNumber, seatingCapacity } = req.body;
    if (!tableNumber || !seatingCapacity) {
        sendError(res, "Table number and seating capacity are required.", StatusCodes.BAD_REQUEST);
        return;
    }
    try {
        const exist = await Table.findOne({ tableNumber, isDelete: false });
        if (exist) {
            sendError(res, "Table number already exists.", StatusCodes.CONFLICT);
            return;
        }
        const table = await Table.create({ tableNumber, seatingCapacity, isDelete: false, isActive: true });
        sendSuccess(res, "Table created successfully.", table, StatusCodes.CREATED);
    } catch (err) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const getTables = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const tables = await Table.find({ isDelete: false }).sort({ createdAt: -1 });
        sendSuccess(res, "Tables fetched successfully.", tables);
    } catch (err) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const getTable = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    if (!id) {
        sendError(res, "Table ID is required.", StatusCodes.BAD_REQUEST);
        return;
    }
    try {
        const table = await Table.findOne({ _id: id, isDelete: false });
        if (!table) {
            sendError(res, "Table not found.", StatusCodes.NOT_FOUND);
            return;
        }
        sendSuccess(res, "Table fetched successfully.", table);
    } catch (err) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const updateTable = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { tableNumber, seatingCapacity, status, isActive } = req.body;
    if (!id) {
        sendError(res, "Table ID is required.", StatusCodes.BAD_REQUEST);
        return;
    }
    try {
        const table = await Table.findOne({ _id: id, isDelete: false });
        if (!table) {
            sendError(res, "Table not found.", StatusCodes.NOT_FOUND);
            return;
        }

        if (tableNumber !== undefined) {
            const exist = await Table.findOne({ tableNumber, _id: { $ne: id }, isDelete: false });
            if (exist) {
                sendError(res, "Table number already exists.", StatusCodes.CONFLICT);
                return;
            }
            if (table.tableNumber !== tableNumber) {
                await QrCode.updateMany({ tableId: table.tableNumber, isDelete: false }, { tableId: tableNumber });
            }
            table.tableNumber = tableNumber;
        }

        if (seatingCapacity !== undefined) {
            table.seatingCapacity = seatingCapacity;
        }

        if (status !== undefined) {
            table.status = status;
        }

        if (isActive !== undefined) {
            table.isActive = isActive;
        }

        await table.save();
        sendSuccess(res, "Table updated successfully.", table);
    } catch (err) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const deleteTable = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    if (!id) {
        sendError(res, "Table ID is required.", StatusCodes.BAD_REQUEST);
        return;
    }
    try {
        const table = await Table.findOne({ _id: id, isDelete: false });
        if (!table) {
            sendError(res, "Table not found.", StatusCodes.NOT_FOUND);
            return;
        }
        table.isDelete = true;
        if (table.assignedQrId) {
            await QrCode.updateMany({ qrCodeId: table.assignedQrId, isDelete: false }, { status: "Unassigned", tableId: null });
        }
        await table.save();
        sendSuccess(res, "Table deleted successfully.", table);
    } catch (err) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};






