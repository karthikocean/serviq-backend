import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Subscription from "../../models/Subscription";
import Restaurant from "../../models/Restaurant";
import Plan from "../../models/Plan";
import { sendSuccess, sendError } from "../../utils/response";
import { pagination } from "../../utils/pagination";
import { AuthRequest } from "../../middleware/authMiddleware";

// GET all active subscriptions
export const getAllSubscriptions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const pageIndex = Math.max(0, page - 1);
        const skip = pageIndex * limit;

        const total = await Subscription.countDocuments({ isDelete: false });

        const subscriptions = await Subscription.find({ isDelete: false })
            .populate("restaurant", "restaurantName restaurantId")
            .populate("plan", "planName")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        
        pagination(total, subscriptions, limit, pageIndex, res, "Subscriptions fetched successfully.");
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// POST Assign / Create a new subscription
export const assignSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const { restaurant, plan, startDate, endDate, renewalDate, status } = req.body;

        if (!restaurant || !plan || !startDate || !endDate || !renewalDate) {
            sendError(res, "All fields are required.", StatusCodes.BAD_REQUEST);
            return;
        }

        // Verify restaurant exists
        const existingRestaurant = await Restaurant.findOne({ _id: restaurant, isDelete: false });
        if (!existingRestaurant) {
            sendError(res, "Restaurant not found.", StatusCodes.NOT_FOUND);
            return;
        }

        // Verify plan exists
        const existingPlan = await Plan.findOne({ _id: plan, isDelete: false });
        if (!existingPlan) {
            sendError(res, "Plan not found.", StatusCodes.NOT_FOUND);
            return;
        }

        // Create the subscription
        const newSubscription = await Subscription.create({
            restaurant,
            plan,
            billingCycle: "Monthly", // Defaulting as it wasn't in the original request body
            startDate,
            endDate,
            renewalDate,
            maxBranches: existingPlan.maxBranches,
            features: existingPlan.featuresIncluded,
            status: status || "Active",
            isActive: true,
            isDelete: false
        });

        sendSuccess(res, "Subscription assigned successfully.", newSubscription, StatusCodes.CREATED);
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// PUT Update subscription details
export const updateSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { plan, startDate, endDate, renewalDate, status, isActive } = req.body;

        const subscription = await Subscription.findOne({ _id: id, isDelete: false });
        if (!subscription) {
            sendError(res, "Subscription not found.", StatusCodes.NOT_FOUND);
            return;
        }

        if (plan) {
            const existingPlan = await Plan.findOne({ _id: plan, isDelete: false });
            if (!existingPlan) {
                sendError(res, "Plan not found.", StatusCodes.NOT_FOUND);
                return;
            }
            subscription.plan = plan;
            subscription.maxBranches = existingPlan.maxBranches;
            subscription.features = existingPlan.featuresIncluded as any;
        }

        if (startDate) subscription.startDate = startDate;
        if (endDate) subscription.endDate = endDate;
        if (renewalDate) subscription.renewalDate = renewalDate;
        if (status) subscription.status = status;
        if (isActive !== undefined) subscription.isActive = isActive;

        await subscription.save();
        sendSuccess(res, "Subscription updated successfully.", subscription);
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// DELETE Soft-delete subscription
export const deleteSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const subscription = await Subscription.findOne({ _id: id, isDelete: false });
        if (!subscription) {
            sendError(res, "Subscription not found.", StatusCodes.NOT_FOUND);
            return;
        }

        subscription.isDelete = true;
        await subscription.save();
        sendSuccess(res, "Subscription deleted successfully.");
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};
