import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Lead from "../../models/Lead";
import { sendSuccess, sendError } from "../../utils/response";
import { pagination } from "../../utils/pagination";
import Restaurant from "../../models/Restaurant";

export const getAllLeads = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 0;
        const limit = parseInt(req.query.limit as string) || 10;
        const pageIndex = Math.max(0, page);
        const skip = pageIndex * limit;

        const query: any = {};

        if (req.query.leadSearchQuery) {
            const search = req.query.leadSearchQuery as string;
            query.$or = [
                { businessName: { $regex: search, $options: "i" } },
                { contactPerson: { $regex: search, $options: "i" } },
                { emailAddress: { $regex: search, $options: "i" } }
            ];
        }

        if (req.query.leadStatusFilter && req.query.leadStatusFilter !== 'All' && req.query.leadStatusFilter !== 'All Status') {
            query.leadStatus = req.query.leadStatusFilter;
        }

        const total = await Lead.countDocuments(query);
        const leads = await Lead.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

        pagination(total, leads, limit, pageIndex, res, "Leads fetched successfully.");
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const createLead = async (req: Request, res: Response): Promise<void> => {
    try {
        const { businessName, contactPerson, emailAddress, mobileNumber, leadSource, leadStatus, followUpDate, assignedTo, remarks } = req.body;

        if (!businessName || !contactPerson || !emailAddress || !mobileNumber) {
            sendError(res, "Required fields are missing.", StatusCodes.BAD_REQUEST);
            return;
        }

        const newLead = new Lead({
            businessName, contactPerson, emailAddress, mobileNumber, leadSource, leadStatus, 
            followUpDate: followUpDate ? new Date(followUpDate) : null,
            assignedTo, remarks
        });

        await newLead.save();
        sendSuccess(res, "Lead created successfully.", newLead, StatusCodes.CREATED);
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const updateLeadStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const lead = await Lead.findById(id);
        if (!lead) {
            sendError(res, "Lead not found.", StatusCodes.NOT_FOUND);
            return;
        }

        lead.leadStatus = status;
        await lead.save();

        sendSuccess(res, "Lead status updated.", lead);
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const assignLead = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { assignedTo } = req.body;

        const lead = await Lead.findById(id);
        if (!lead) {
            sendError(res, "Lead not found.", StatusCodes.NOT_FOUND);
            return;
        }

        lead.assignedTo = assignedTo;
        await lead.save();

        sendSuccess(res, "Lead assigned successfully.", lead);
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const updateFollowUp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { followUpDate } = req.body;

        const lead = await Lead.findById(id);
        if (!lead) {
            sendError(res, "Lead not found.", StatusCodes.NOT_FOUND);
            return;
        }

        lead.followUpDate = followUpDate ? new Date(followUpDate) : null;
        await lead.save();

        sendSuccess(res, "Lead follow-up updated.", lead);
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const convertLead = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const lead = await Lead.findById(id);
        
        if (!lead) {
            sendError(res, "Lead not found.", StatusCodes.NOT_FOUND);
            return;
        }

        // Check if restaurant with same email already exists
        const existingRest = await Restaurant.findOne({ email: lead.emailAddress, isDelete: false });
        if (existingRest) {
            sendError(res, "A restaurant with this email already exists.", StatusCodes.CONFLICT);
            return;
        }

        // Only validate and return success so frontend can redirect to Add Restaurant form
        sendSuccess(res, "Lead valid for conversion. Redirecting...", lead);
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};
