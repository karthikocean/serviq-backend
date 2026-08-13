import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { pagination } from "../../utils/pagination";
import { AuthRequest } from "../../middleware/authMiddleware";
import Order from "../../models/Order";
import Table from "../../models/Table";

export const getOrders = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { restaurantId, activeBranchId } = req.user as any;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const pageIndex = Math.max(0, page - 1);
        const skip = pageIndex * limit;

        const total = await Order.countDocuments({ restaurantId, branchId: activeBranchId, isDelete: false });

        const orders = await Order.find({ restaurantId, branchId: activeBranchId, isDelete: false })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
            
        pagination(total, orders, limit, pageIndex, res, "Orders fetched successfully.");
    } catch (err) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { table, items, notes, waiter } = req.body;
        if (!table || !items || !Array.isArray(items)) {
            sendError(res, "Table and items are required.", StatusCodes.BAD_REQUEST);
            return;
        }

        // Generate next numerical order ID
        const { restaurantId, activeBranchId } = req.user as any;
        if (!activeBranchId) {
            sendError(res, "Please select an active branch to create an order.", StatusCodes.BAD_REQUEST);
            return;
        }
        const allOrders = await Order.find({ restaurantId, branchId: activeBranchId });
        let maxId = 840;
        allOrders.forEach(o => {
            const num = parseInt(o.orderId);
            if (!isNaN(num) && num > maxId) {
                maxId = num;
            }
        });
        const orderId = String(maxId + 1);

        // Format time
        const now = new Date();
        const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
        const time = now.toLocaleTimeString('en-US', timeOptions);

        // Calculate totals
        const subtotal = items.reduce((sum: number, item: any) => sum + (item.qty * item.price), 0);
        const tax = parseFloat((subtotal * 0.05).toFixed(2)); // Default tax rate 5%
        const total = subtotal + tax;

        const newOrder = await Order.create({
            restaurantId,
            branchId: activeBranchId,
            orderId,
            table,
            time,
            items,
            notes: notes || "",
            subtotal,
            tax,
            charge: 0,
            total,
            status: "new",
            billingStatus: "unpaid",
            waiter: waiter || "Unassigned",
            isDelete: false
        });

        // Set table to Occupied (true)
        const rawNum = table.replace("Table ", "").trim();
        const cleanTableNumber = rawNum.length === 1 ? `T-0${rawNum}` : `T-${rawNum}`;
        const dbTable = await Table.findOne({
            $or: [
                { tableNumber: cleanTableNumber },
                { tableNumber: `T-${parseInt(rawNum)}` },
                { tableNumber: rawNum }
            ],
            restaurantId,
            branchId: activeBranchId,
            isDelete: false
        });
        if (dbTable) {
            dbTable.status = "Occupied";
            await dbTable.save();
        }

        sendSuccess(res, "Order created successfully.", newOrder, StatusCodes.CREATED);
    } catch (err) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const updateOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params; // order id (e.g. orderId or _id)
    try {
        const { restaurantId, activeBranchId } = req.user as any;
        const order = await Order.findOne({
            $or: [
                { orderId: id },
                { _id: id }
            ],
            restaurantId,
            branchId: activeBranchId,
            isDelete: false
        });

        if (!order) {
            sendError(res, "Order not found.", StatusCodes.NOT_FOUND);
            return;
        }

        const { status, billingStatus, waiter, items, notes } = req.body;

        if (status !== undefined) order.status = status;
        if (billingStatus !== undefined) order.billingStatus = billingStatus;
        if (waiter !== undefined) order.waiter = waiter;
        if (notes !== undefined) order.notes = notes;

        if (items !== undefined && Array.isArray(items)) {
            order.items = items;
            const subtotal = items.reduce((sum: number, item: any) => sum + (item.qty * item.price), 0);
            order.subtotal = subtotal;
            order.tax = parseFloat((subtotal * 0.05).toFixed(2));
            order.total = subtotal + order.tax + order.charge;
        }

        await order.save();
        sendSuccess(res, "Order updated successfully.", order);
    } catch (err) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const deleteOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const { restaurantId, activeBranchId } = req.user as any;
        const order = await Order.findOne({
            $or: [
                { orderId: id },
                { _id: id }
            ],
            restaurantId,
            branchId: activeBranchId,
            isDelete: false
        });

        if (!order) {
            sendError(res, "Order not found.", StatusCodes.NOT_FOUND);
            return;
        }

        order.isDelete = true;
        await order.save();
        sendSuccess(res, "Order deleted successfully.", order);
    } catch (err) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const payBill = async (req: AuthRequest, res: Response): Promise<void> => {
    const { tableLabel } = req.body;
    if (!tableLabel) {
        sendError(res, "Table label is required.", StatusCodes.BAD_REQUEST);
        return;
    }
    try {
        const rawNum = tableLabel.replace("Table ", "").trim();
        const { restaurantId, activeBranchId } = req.user as any;

        // 1. Find all unpaid orders for the table
        const unpaidOrders = await Order.find({ restaurantId, branchId: activeBranchId, isDelete: false, billingStatus: "unpaid" });
        const targetOrders = unpaidOrders.filter(o => {
            const oNum = o.table.replace("Table ", "").trim();
            return oNum === rawNum || parseInt(oNum) === parseInt(rawNum);
        });

        // Update each order to paid and done
        for (const order of targetOrders) {
            order.billingStatus = "paid";
            order.status = "done";
            await order.save();
        }

        // 2. Free up the table
        const cleanTableNumber = rawNum.length === 1 ? `T-0${rawNum}` : `T-${rawNum}`;
        const dbTable = await Table.findOne({
            $or: [
                { tableNumber: cleanTableNumber },
                { tableNumber: `T-${parseInt(rawNum)}` },
                { tableNumber: rawNum }
            ],
            restaurantId,
            branchId: activeBranchId,
            isDelete: false
        });
        if (dbTable) {
            dbTable.status = "Available"; // set status to Free
            await dbTable.save();
        }

        sendSuccess(res, `Bill for ${tableLabel} marked as paid successfully.`);
    } catch (err) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};
