import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Ticket from "../../models/Ticket";
import Restaurant from "../../models/Restaurant";
import Branch from "../../models/Branch";
import Admin from "../../models/Admin";
import User from "../../models/User";
import { sendSuccess, sendError } from "../../utils/response";
import { pagination } from "../../utils/pagination";

/**
 * @desc Get tickets for authenticated restaurant / branch / owner
 * @route GET /api/admin/tickets
 */
export const getMyTickets = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        if (!user || !user.restaurantId) {
            sendError(res, "Unauthorized access. Restaurant context missing.", StatusCodes.UNAUTHORIZED);
            return;
        }

        const page = parseInt(req.query.page as string) || 0;
        const limit = parseInt(req.query.limit as string) || 10;
        const pageIndex = Math.max(0, page);
        const skip = pageIndex * limit;

        const query: any = { restaurantId: user.restaurantId };

        // Role-based scoping
        if (user.userType === 'BRANCH_ADMIN' || user.userType === 'STAFF') {
            if (user.activeBranchId) {
                query.branchId = user.activeBranchId;
            } else {
                query.createdBy = user.userId;
            }
        } else if (user.userType === 'RESTAURANT_OWNER') {
            // Company Admin can filter by branch or view types
            if (req.query.branchId && req.query.branchId !== 'All' && req.query.branchId !== 'all') {
                query.branchId = req.query.branchId;
            }

            if (req.query.raisedByMeOnly === 'true') {
                query.createdBy = user.userId;
            }

            if (req.query.ticketRaisedToFilter && req.query.ticketRaisedToFilter !== 'All') {
                query.ticketRaisedTo = req.query.ticketRaisedToFilter;
            }
        }

        // Search filter
        if (req.query.search) {
            const search = req.query.search as string;
            query.$or = [
                { ticketNumber: { $regex: search, $options: "i" } },
                { subject: { $regex: search, $options: "i" } },
                { branchName: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } }
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

        // Escalation filter
        if (req.query.isEscalated === 'true') {
            query.isEscalated = true;
        }

        const total = await Ticket.countDocuments(query);
        const tickets = await Ticket.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('createdBy', 'name email phoneNumber userType')
.populate('branchId', 'branchName branchCode')
.populate('escalatedBy', 'name email')
            .lean();

        pagination(total, tickets, limit, pageIndex, res, "Tickets fetched successfully.");
    } catch (error: any) {
        console.error("getMyTickets Error:", error);
        sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

/**
 * @desc Create a new support ticket (Branch -> Company Admin, or Company Admin -> Super Admin)
 * @route POST /api/admin/tickets
 */
export const createTicket = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        if (!user || !user.restaurantId) {
            sendError(res, "Unauthorized access. Restaurant context missing.", StatusCodes.UNAUTHORIZED);
            return;
        }

        const { subject, category, priority, description, branchId, attachmentUrl, ticketRaisedTo: requestedRaisedTo } = req.body;

        if (!subject || !category || !description) {
            sendError(res, "Subject, category, and description are required.", StatusCodes.BAD_REQUEST);
            return;
        }

        // Fetch Restaurant details
        const restaurant = await Restaurant.findById(user.restaurantId);
        if (!restaurant) {
            sendError(res, "Restaurant not found.", StatusCodes.NOT_FOUND);
            return;
        }

        // Determine branch details
        let targetBranchId = branchId || user.activeBranchId || null;
        let targetBranchName = "";

        if (targetBranchId) {
            const branch = await Branch.findById(targetBranchId);
            if (branch) {
                targetBranchName = branch.branchName;
            }
        }

        // Fetch creator user details
        let creatorName = "";
        let adminUser = await Admin.findById(user.userId);
        if (adminUser) {
            creatorName = adminUser.name;
        } else {
            const staffUser = await User.findById(user.userId);
            if (staffUser) {
                creatorName = staffUser.name;
            }
        }

        // Auto routing logic for ticketRaisedTo:
        // - If created by RESTAURANT_OWNER -> Super Admin
        // - If created by BRANCH_ADMIN / STAFF -> Company Admin
        let ticketRaisedTo: 'Company Admin' | 'Super Admin' = 'Company Admin';

        if (requestedRaisedTo === 'Super Admin' || requestedRaisedTo === 'Company Admin') {
            ticketRaisedTo = requestedRaisedTo;
        } else if (user.userType === 'RESTAURANT_OWNER') {
            ticketRaisedTo = 'Super Admin';
        } else {
            ticketRaisedTo = 'Company Admin';
        }

        // Generate Ticket Number
        const totalCount = await Ticket.countDocuments();
        const ticketNumber = `TKT-${1001 + totalCount}`;

        const newTicket = new Ticket({
            ticketNumber,
            restaurantId: user.restaurantId,
            restaurantName: restaurant.restaurantName,
            branchId: targetBranchId,
            branchName: targetBranchName,
            createdBy: user.userId,
            createdByName: creatorName,
            creatorRole: user.userType,
            ticketRaisedTo,
            subject,
            category,
            priority: priority || 'Medium',
            description,
            attachmentUrl: attachmentUrl || '',
            status: 'Open'
        });

        await newTicket.save();
        sendSuccess(res, "Ticket created successfully.", newTicket, StatusCodes.CREATED);
    } catch (error: any) {
        console.error("createTicket Error:", error);
        sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

/**
 * @desc Get ticket details by ID
 * @route GET /api/admin/tickets/:id
 */
export const getTicketById = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        if (!user || !user.restaurantId) {
            sendError(res, "Unauthorized access.", StatusCodes.UNAUTHORIZED);
            return;
        }

        const { id } = req.params;
        const ticket = await Ticket.findOne({ _id: id, restaurantId: user.restaurantId })
            .populate('createdBy', 'name email phoneNumber userType')
            .populate('branchId', 'branchName branchCode contactNumber address')
            .populate('escalatedBy', 'name email')
            .lean();

        if (!ticket) {
            sendError(res, "Ticket not found.", StatusCodes.NOT_FOUND);
            return;
        }

        sendSuccess(res, "Ticket fetched successfully.", ticket);
    } catch (error: any) {
        console.error("getTicketById Error:", error);
        sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

/**
 * @desc Escalate / Move ticket to Super Admin (Company Admin moves unresolved branch ticket to Super Admin)
 * @route POST /api/admin/tickets/:id/escalate
 */
export const escalateTicketToSuperAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        if (!user || !user.restaurantId) {
            sendError(res, "Unauthorized access.", StatusCodes.UNAUTHORIZED);
            return;
        }

        const { id } = req.params;
        const { escalationReason } = req.body;

        const ticket = await Ticket.findOne({ _id: id, restaurantId: user.restaurantId });

        if (!ticket) {
            sendError(res, "Ticket not found.", StatusCodes.NOT_FOUND);
            return;
        }

        // Fetch user name for escalatedByName
        let adminName = "";
        const adminUser = await Admin.findById(user.userId);
        if (adminUser) {
            adminName = adminUser.name;
        }

        ticket.ticketRaisedTo = 'Super Admin';
        ticket.isEscalated = true;
        ticket.status = 'Escalated';
        ticket.escalatedBy = user.userId;
        ticket.escalatedByName = adminName;
        ticket.escalatedAt = new Date();
        ticket.escalationReason = escalationReason || 'Escalated to Super Admin for resolution';

        await ticket.save();

        sendSuccess(res, "Ticket successfully escalated to Super Admin.", ticket);
    } catch (error: any) {
        console.error("escalateTicketToSuperAdmin Error:", error);
        sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

/**
 * @desc Update ticket status and resolution reply by Admin/Company Owner
 * @route PATCH /api/admin/tickets/:id/status
 */
export const updateTicketStatusByAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        if (!user || !user.restaurantId) {
            sendError(res, "Unauthorized access.", StatusCodes.UNAUTHORIZED);
            return;
        }

        const { id } = req.params;
        const { status, resolution } = req.body;

        const ticket = await Ticket.findOne({ _id: id, restaurantId: user.restaurantId });

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

        sendSuccess(res, "Ticket updated successfully.", ticket);
    } catch (error: any) {
        console.error("updateTicketStatusByAdmin Error:", error);
        sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
    }
};
