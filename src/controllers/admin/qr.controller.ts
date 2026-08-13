import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { pagination } from "../../utils/pagination";
import { AuthRequest } from "../../middleware/authMiddleware";
import QrCode from "../../models/QrCode";
import Table from "../../models/Table";
import Branch from "../../models/Branch";

export const getQrCodes = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const restaurantId = req.user?.restaurantId;
        const branchId = req.user?.activeBranchId;

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const pageIndex = Math.max(0, page - 1);
        const skip = pageIndex * limit;

        const total = await QrCode.countDocuments({ isDelete: false, restaurantId, branchId });

        const qrCodes = await QrCode.find({ isDelete: false, restaurantId, branchId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
            
        
        pagination(total, qrCodes, limit, pageIndex, res, "QR codes fetched successfully.");
    } catch (err: any) {
        console.error("QR Fetch Error:", err);
        sendError(res, err ? String(err) : "Unknown error", StatusCodes.INTERNAL_SERVER_ERROR);
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
        let branchId = req.user?.activeBranchId;
        if (!branchId && req.user?.restaurantId) {
            const mainBranch = await Branch.findOne({ restaurantId: req.user.restaurantId, isMainBranch: true });
            if (mainBranch) branchId = mainBranch._id.toString();
        }
        if (!branchId) {
            sendError(res, "Active branch not found for this user.", StatusCodes.BAD_REQUEST);
            return;
        }

        const newQr = await QrCode.create({
            restaurantId: req.user?.restaurantId,
            branchId: branchId,
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
            createdAt: (newQr.createdAt && typeof newQr.createdAt.toISOString === 'function') ? newQr.createdAt.toISOString().split("T")[0] : null
        }, StatusCodes.CREATED);
    } catch (err: any) {
        console.error("Generate QR Error:", err);
        sendError(res, err ? String(err) : "Unknown error", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const assignQrCode = async (req: AuthRequest, res: Response): Promise<void> => {
    const { qrCodeId, tableId } = req.body;
    if (!qrCodeId || !tableId) {
        sendError(res, "QR Code ID and Table ID are required.", StatusCodes.BAD_REQUEST);
        return;
    }
    try {
        const restaurantId = req.user?.restaurantId;
        const branchId = req.user?.activeBranchId;

        const qrCode = await QrCode.findOne({ qrCodeId, restaurantId, branchId, isDelete: false });
        if (!qrCode) {
            sendError(res, "QR Code not found.", StatusCodes.NOT_FOUND);
            return;
        }

        const table = await Table.findOne({ tableNumber: tableId, restaurantId, branchId, isDelete: false });
        if (!table) {
            sendError(res, "Table not found.", StatusCodes.NOT_FOUND);
            return;
        }

        // 1. Unlink tableId from any other QR Codes
        await QrCode.updateMany(
            { tableId: tableId, qrCodeId: { $ne: qrCodeId }, restaurantId, branchId, isDelete: false },
            { status: "Unassigned", tableId: null }
        );

        // 2. Unlink this qrCodeId from any other Tables
        await Table.updateMany(
            { assignedQrId: qrCodeId, tableNumber: { $ne: tableId }, restaurantId, branchId, isDelete: false },
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
        const restaurantId = req.user?.restaurantId;
        const branchId = req.user?.activeBranchId;

        const qrCode = await QrCode.findOne({ qrCodeId, restaurantId, branchId, isDelete: false });
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
                { tableNumber: tableId, restaurantId, branchId, isDelete: false },
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
        const restaurantId = req.user?.restaurantId;
        const branchId = req.user?.activeBranchId;

        const qrCode = await QrCode.findOne({ qrCodeId: id, restaurantId, branchId, isDelete: false });
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
                { tableNumber: tableId, restaurantId, branchId, isDelete: false },
                { assignedQrId: null }
            );
        }

        sendSuccess(res, "QR Code deleted successfully.", qrCode);
    } catch (err) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};
