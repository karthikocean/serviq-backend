import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Ticket from "../../models/Ticket";
import { sendSuccess, sendError } from "../../utils/response";
import { pagination } from "../../utils/pagination";

export const getAllTickets = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 0;
        const limit = parseInt(req.query.limit as string) || 10;
        const pageIndex = Math.max(0, page);
        const skip = pageIndex * limit;

        const query: any = {};

        if (req.query.searchTerm) {
            const search = req.query.searchTerm as string;
            query.$or = [
                { ticketNumber: { $regex: search, $options: "i" } },
                { restaurantName: { $regex: search, $options: "i" } },
                { subject: { $regex: search, $options: "i" } }
            ];
        }

        if (req.query.statusFilter && req.query.statusFilter !== 'All' && req.query.statusFilter !== 'All Statuses') {
            query.status = req.query.statusFilter;
        }

        if (req.query.priorityFilter && req.query.priorityFilter !== 'All' && req.query.priorityFilter !== 'All Priorities') {
            query.priority = req.query.priorityFilter;
        }
        
        if (req.query.categoryFilter && req.query.categoryFilter !== 'All' && req.query.categoryFilter !== 'All Categories') {
            query.category = req.query.categoryFilter;
        }

        const total = await Ticket.countDocuments(query);
        const tickets = await Ticket.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

        pagination(total, tickets, limit, pageIndex, res, "Tickets fetched successfully.");
    } catch (error: any) {
        sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const getTicketById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const ticket = await Ticket.findById(id).lean();

        if (!ticket) {
            sendError(res, "Ticket not found.", StatusCodes.NOT_FOUND);
            return;
        }

        sendSuccess(res, "Ticket fetched successfully.", ticket);
    } catch (error: any) {
        sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

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
        sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

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
        sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

