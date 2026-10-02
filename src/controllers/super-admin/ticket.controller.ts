import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Ticket from "../../models/Ticket";
import { sendSuccess, sendError } from "../../utils/response";
import { pagination } from "../../utils/pagination";

/**
 * @desc Get all support tickets for Super Admin with search, filters, pagination
 * @route GET /api/super-admin/tickets
 */
export const getAllTickets = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 0;
        const limit = parseInt(req.query.limit as string) || 10;
        const pageIndex = Math.max(0, page);
        const skip = pageIndex * limit;

        const query: any = {};

        // Default: Super Admin usually views tickets directed to Super Admin or escalated tickets,
        // but if viewAll=true is passed, show all tickets.
        if (req.query.viewAll !== 'true') {
            if (req.query.ticketRaisedToFilter && req.query.ticketRaisedToFilter !== 'All') {
                query.ticketRaisedTo = req.query.ticketRaisedToFilter;
            } else {
                query.$or = [
                    { ticketRaisedTo: 'Super Admin' },
                    { isEscalated: true }
                ];
            }
        }

        // Search filter
        if (req.query.search) {
            const search = req.query.search as string;
            const searchRegex = { $regex: search, $options: "i" };
            query.$or = [
                { ticketNumber: searchRegex },
                { restaurantName: searchRegex },
                { branchName: searchRegex },
                { subject: searchRegex },
                { description: searchRegex }
            ];
        }

        // Status filter
        if (req.query.statusFilter && req.query.statusFilter !== 'All' && req.query.statusFilter !== 'All Statuses') {
            query.status = req.query.statusFilter;
        }

        // Priority filter
        if (req.query.priorityFilter && req.query.priorityFilter !== 'All' && req.query.priorityFilter !== 'All Priorities') {
            query.priority = req.query.priorityFilter;
        }

        // Category filter
        if (req.query.categoryFilter && req.query.categoryFilter !== 'All' && req.query.categoryFilter !== 'All Categories') {
            query.category = req.query.categoryFilter;
        }

        // Restaurant filter
        if (req.query.restaurantId) {
            query.restaurantId = req.query.restaurantId;
        }

        // Branch filter
        if (req.query.branchId) {
            query.branchId = req.query.branchId;
        }

        // Escalation filter
        if (req.query.isEscalated === 'true') {
            query.isEscalated = true;
        }

        const total = await Ticket.countDocuments(query);
        const tickets = await Ticket.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('restaurantId', 'restaurantName email phone')
            .populate('branchId', 'branchName branchCode')
            .populate('createdBy', 'name email phoneNumber userType')
            .populate('escalatedBy', 'name email')
            .lean();

        pagination(total, tickets, limit, pageIndex, res, "Tickets fetched successfully.");
    } catch (error: any) {
        console.error("SuperAdmin getAllTickets Error:", error);
        sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

/**
 * @desc Get ticket by ID for Super Admin
 * @route GET /api/super-admin/tickets/:id
 */
export const getTicketById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const ticket = await Ticket.findById(id)
            .populate('restaurantId', 'restaurantName email phone address')
            .populate('branchId', 'branchName branchCode contactNumber address')
            .populate('createdBy', 'name email phoneNumber userType')
            .populate('escalatedBy', 'name email')
            .lean();

        if (!ticket) {
            sendError(res, "Ticket not found.", StatusCodes.NOT_FOUND);
            return;
        }

        sendSuccess(res, "Ticket fetched successfully.", ticket);
    } catch (error: any) {
        console.error("SuperAdmin getTicketById Error:", error);
        sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

/**
 * @desc Update ticket status and resolution by Super Admin
 * @route PATCH /api/super-admin/tickets/:id/status
 */
export const updateTicketStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status, resolution } = req.body;

        const ticket = await Ticket.findById(id);
        if (!ticket) {
            sendError(res, "Ticket not found.", StatusCodes.NOT_FOUND);
            return;
        }

        if (status) {
            ticket.status = status;
            if (status === 'Resolved' || status === 'Closed') {
                ticket.resolvedAt = new Date();
            }
        }

        if (resolution !== undefined) {
            ticket.resolution = resolution;
        }

        await ticket.save();

        sendSuccess(res, "Ticket status and resolution updated successfully.", ticket);
    } catch (error: any) {
        console.error("SuperAdmin updateTicketStatus Error:", error);
        sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

/**
 * @desc Assign ticket to a support user
 * @route PATCH /api/super-admin/tickets/:id/assign
 */
export const assignTicket = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { assignedUser } = req.body;

        const ticket = await Ticket.findById(id);
        if (!ticket) {
            sendError(res, "Ticket not found.", StatusCodes.NOT_FOUND);
            return;
        }

        ticket.assignedUser = assignedUser;
        if (ticket.status === 'Open' && assignedUser && assignedUser !== 'Unassigned') {
            ticket.status = 'In Progress';
        }
        await ticket.save();

        sendSuccess(res, "Ticket assigned successfully.", ticket);
    } catch (error: any) {
        console.error("SuperAdmin assignTicket Error:", error);
        sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
    }
};
