import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Subscription from "../../models/Subscription";
import Restaurant from "../../models/Restaurant";
import Plan from "../../models/Plan";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/authMiddleware";

// GET all active subscriptions
export const getAllSubscriptions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const subscriptions = await Subscription.find({ isDelete: false })
            .populate("restaurant", "restaurantName restaurantId")
            .populate("plan", "planName")
            .sort({ createdAt: -1 });
        sendSuccess(res, "Subscriptions fetched successfully.", subscriptions);
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
            startDate,
            endDate,
            renewalDate,
            status: status || "Active",
            isActive: true,
            isDelete: false
        });

        // Sync subscription plan in Restaurant model
        existingRestaurant.subscriptionPlan = plan;
        await existingRestaurant.save();

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

            // Also update the restaurant's active plan
            await Restaurant.updateOne(
                { _id: subscription.restaurant },
                { $set: { subscriptionPlan: plan } }
            );
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
