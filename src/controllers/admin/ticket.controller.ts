import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Ticket from "../../models/Ticket";
import Restaurant from "../../models/Restaurant";
import { sendSuccess, sendError } from "../../utils/response";
import { pagination } from "../../utils/pagination";

export const getMyTickets = async (req: Request, res: Response): Promise<void> => {
    try {
        const admin = (req as any).user;
        if (!admin || !admin.restaurantId) {
            sendError(res, "Unauthorized access.", StatusCodes.UNAUTHORIZED);
            return;
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const pageIndex = Math.max(0, page - 1);
        const skip = pageIndex * limit;

        const query: any = { restaurantId: admin.restaurantId };

        if (req.query.searchTerm) {
            const search = req.query.searchTerm as string;
            query.$or = [
                { ticketNumber: { $regex: search, $options: "i" } },
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
        const tickets = await Ticket.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('createdBy', 'firstName lastName email')
            .lean();

        pagination(total, tickets, limit, pageIndex, res, "Tickets fetched successfully.");
    } catch (error) {
        console.error(error);
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const createTicket = async (req: Request, res: Response): Promise<void> => {
    try {
        const admin = (req as any).user;
        if (!admin || !admin.restaurantId) {
            sendError(res, "Unauthorized access.", StatusCodes.UNAUTHORIZED);
            return;
        }

        const { subject, category, priority, description } = req.body;

        if (!subject || !category || !description) {
            sendError(res, "Required fields are missing.", StatusCodes.BAD_REQUEST);
            return;
        }

        const totalCount = await Ticket.countDocuments();
        const ticketNumber = `TKT-${1001 + totalCount}`;

        // Get the restaurant details to store restaurantName
        // But to avoid an extra DB call, we can assume the frontend will pass it or we fetch it.
        // Let's fetch it just to be safe.
        const restaurant = await Restaurant.findById(admin.restaurantId);
        
        if (!restaurant) {
            sendError(res, "Restaurant not found.", StatusCodes.NOT_FOUND);
            return;
        }

        const newTicket = new Ticket({
            ticketNumber,
            restaurantId: admin.restaurantId,
            restaurantName: restaurant.restaurantName,
            createdBy: admin.userId,
            subject,
            category,
            priority,
            description
        });

        await newTicket.save();
        sendSuccess(res, "Ticket created successfully.", newTicket, StatusCodes.CREATED);
    } catch (error) {
        console.error(error);
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};
