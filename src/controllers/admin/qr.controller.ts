import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/authMiddleware";
import QrCode from "../../models/QrCode";
import Table from "../../models/Table";

export const getQrCodes = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const qrCodes = await QrCode.find({ isDelete: false }).sort({ createdAt: -1 });
        // Format to match frontend structure (with id mapped to qrCodeId)
        const formatted = qrCodes.map(q => ({
            _id: q._id,
            id: q.qrCodeId,
            status: q.status,
            tableId: q.tableId,
            scansCount: q.scansCount,
            createdAt: q.createdAt ? q.createdAt.toISOString().split("T")[0] : null
        }));
        sendSuccess(res, "QR codes fetched successfully.", formatted);
    } catch (err) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const generateQrCode = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const qrCodes = await QrCode.find({});
        let maxNum = 100;
        qrCodes.forEach(q => {
            const num = parseInt(q.qrCodeId.replace("QR-", ""));
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        });
        const nextId = `QR-${maxNum + 1}`;
        const newQr = await QrCode.create({
            qrCodeId: nextId,
            status: "Unassigned",
            tableId: null,
            scansCount: 0,
            isDelete: false
        });
        sendSuccess(res, "QR code generated successfully.", {
            _id: newQr._id,
            id: newQr.qrCodeId,
            status: newQr.status,
            tableId: newQr.tableId,
            scansCount: newQr.scansCount,
            createdAt: newQr.createdAt ? newQr.createdAt.toISOString().split("T")[0] : null
        }, StatusCodes.CREATED);
    } catch (err) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const assignQrCode = async (req: AuthRequest, res: Response): Promise<void> => {
    const { qrCodeId, tableId } = req.body;
    if (!qrCodeId || !tableId) {
        sendError(res, "QR Code ID and Table ID are required.", StatusCodes.BAD_REQUEST);
        return;
    }
    try {
        const qrCode = await QrCode.findOne({ qrCodeId, isDelete: false });
        if (!qrCode) {
            sendError(res, "QR Code not found.", StatusCodes.NOT_FOUND);
            return;
        }

        const table = await Table.findOne({ tableNumber: tableId, isDelete: false });
        if (!table) {
            sendError(res, "Table not found.", StatusCodes.NOT_FOUND);
            return;
        }

        // 1. Unlink tableId from any other QR Codes
        await QrCode.updateMany(
            { tableId: tableId, qrCodeId: { $ne: qrCodeId }, isDelete: false },
            { status: "Unassigned", tableId: null }
        );

        // 2. Unlink this qrCodeId from any other Tables
        await Table.updateMany(
            { assignedQrId: qrCodeId, tableNumber: { $ne: tableId }, isDelete: false },
            { assignedQrId: null }
        );

        // 3. Update current QR code
        qrCode.status = "Assigned";
        qrCode.tableId = tableId;
        await qrCode.save();

        // 4. Update current Table
        table.assignedQrId = qrCodeId;
        await table.save();

        sendSuccess(res, "QR Code assigned to table successfully.", { qrCode, table });
    } catch (err) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const revokeQrCode = async (req: AuthRequest, res: Response): Promise<void> => {
    const { qrCodeId } = req.body;
    if (!qrCodeId) {
        sendError(res, "QR Code ID is required.", StatusCodes.BAD_REQUEST);
        return;
    }
    try {
        const qrCode = await QrCode.findOne({ qrCodeId, isDelete: false });
        if (!qrCode) {
            sendError(res, "QR Code not found.", StatusCodes.NOT_FOUND);
            return;
        }

        const tableId = qrCode.tableId;

        // 1. Update QR Code
        qrCode.status = "Unassigned";
        qrCode.tableId = null;
        await qrCode.save();

        // 2. Update Table
        if (tableId) {
            await Table.updateMany(
                { tableNumber: tableId, isDelete: false },
                { assignedQrId: null }
            );
        }

        sendSuccess(res, "QR Code unlinked from table successfully.", qrCode);
    } catch (err) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const deleteQrCode = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params; // here id is the qrCodeId (e.g. "QR-101")
    if (!id) {
        sendError(res, "QR Code ID is required.", StatusCodes.BAD_REQUEST);
        return;
    }
    try {
        const qrCode = await QrCode.findOne({ qrCodeId: id, isDelete: false });
        if (!qrCode) {
            sendError(res, "QR Code not found.", StatusCodes.NOT_FOUND);
            return;
        }

        const tableId = qrCode.tableId;

        // 1. Soft delete QR Code
        qrCode.isDelete = true;
        qrCode.status = "Unassigned";
        qrCode.tableId = null;
        await qrCode.save();

        // 2. Update Table
        if (tableId) {
            await Table.updateMany(
                { tableNumber: tableId, isDelete: false },
                { assignedQrId: null }
            );
        }

        sendSuccess(res, "QR Code deleted successfully.", qrCode);
    } catch (err) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};
