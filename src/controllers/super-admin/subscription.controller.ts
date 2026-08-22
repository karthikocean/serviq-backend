import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import Subscription from "../../models/Subscription";
import Restaurant from "../../models/Restaurant";
import Plan from "../../models/Plan";
import Addon from "../../models/Addon";
import SubscriptionHistory from "../../models/SubscriptionHistory";
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
        const { restaurant, plan, startDate, endDate, renewalDate, status, amountPaid } = req.body;

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

        // Enforce Single Active Subscription
        const activeSub = await Subscription.findOne({ restaurant, status: "Active", isDelete: false });
        if (activeSub) {
            sendError(res, "Restaurant already has an active subscription. Please use Plan Change feature.", StatusCodes.CONFLICT);
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
            billingCycle: "Monthly",
            startDate,
            endDate,
            renewalDate,
            maxBranches: existingPlan.maxBranches,
            features: existingPlan.featuresIncluded,
            status: status || "Active",
            amountPaid: amountPaid || existingPlan.monthlyPrice,
            isActive: true,
            isDelete: false
        });

        await SubscriptionHistory.create({
            restaurant,
            subscription: newSubscription._id,
            action: "New Plan",
            details: `Assigned new plan: ${existingPlan.planName}`,
            amountPaid: newSubscription.amountPaid
        });

        sendSuccess(res, "Subscription assigned successfully.", newSubscription, StatusCodes.CREATED);
    } catch (error) {
        console.error("Assign Sub Error:", error);
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// POST Change Plan (Upgrade/Downgrade with Proration)
export const changePlan = async (req: Request, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { restaurantId, newPlanId, billingCycle } = req.body; // billingCycle: "Monthly" | "Annually"

        const restaurant = await Restaurant.findById(restaurantId).session(session);
        if (!restaurant) throw new Error("Restaurant not found");

        const activeSub = await Subscription.findOne({ restaurant: restaurantId, status: "Active", isDelete: false }).session(session);
        if (!activeSub) throw new Error("No active subscription found to change");

        const newPlan = await Plan.findById(newPlanId).session(session);
        if (!newPlan) throw new Error("New plan not found");

        // Calculate Proration
        const today = new Date();
        const start = new Date(activeSub.startDate);
        const end = new Date(activeSub.endDate);

        let unusedCredit = 0;
        if (end > today) {
            const totalDays = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
            const unusedDays = (end.getTime() - today.getTime()) / (1000 * 3600 * 24);
            unusedCredit = (unusedDays / totalDays) * activeSub.amountPaid;
        }

        let totalCredit = unusedCredit + (restaurant.subscriptionCredit || 0);
        const newPlanPrice = billingCycle === "Annually" ? newPlan.annualPrice : newPlan.monthlyPrice;

        let payableAmount = newPlanPrice - totalCredit;
        let creditsUsed = 0;

        if (payableAmount <= 0) {
            restaurant.subscriptionCredit = Math.abs(payableAmount);
            creditsUsed = newPlanPrice;
            payableAmount = 0;
        } else {
            creditsUsed = totalCredit;
            restaurant.subscriptionCredit = 0;
        }
        await restaurant.save({ session });

        // Cancel old sub
        activeSub.status = "Cancelled";
        await activeSub.save({ session });

        // Calculate new dates
        const newEndDate = new Date();
        if (billingCycle === "Annually") {
            newEndDate.setFullYear(newEndDate.getFullYear() + 1);
        } else {
            newEndDate.setMonth(newEndDate.getMonth() + 1);
        }

        // Create new sub
        const newSub = await Subscription.create([{
            restaurant: restaurantId,
            plan: newPlanId,
            billingCycle: billingCycle || "Monthly",
            startDate: today,
            endDate: newEndDate,
            renewalDate: newEndDate,
            maxBranches: newPlan.maxBranches,
            features: newPlan.featuresIncluded,
            status: "Active",
            amountPaid: payableAmount,
            extraBranches: 0, // Reset addons
            upgradedFrom: activeSub._id,
            isActive: true,
            isDelete: false
        }], { session });

        await SubscriptionHistory.create([{
            restaurant: restaurantId,
            subscription: newSub[0]._id,
            action: "Plan Change",
            details: `Changed plan to ${newPlan.planName}. Prorated credit applied.`,
            amountPaid: payableAmount,
            creditsUsed: creditsUsed
        }], { session });

        await session.commitTransaction();
        session.endSession();

        sendSuccess(res, "Plan changed successfully", { payableAmount, subscription: newSub[0] });
    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();
        console.error("Change Plan Error:", error);
        sendError(res, error.message || "Internal server error", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// POST Purchase Addon
export const purchaseAddon = async (req: Request, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { restaurantId, addonId, quantity } = req.body;

        const activeSub = await Subscription.findOne({ restaurant: restaurantId, status: "Active", isDelete: false }).session(session);
        if (!activeSub) throw new Error("No active subscription found");

        const addon = await Addon.findById(addonId).session(session);
        if (!addon) throw new Error("Addon not found");

        // Proration math
        const today = new Date();
        const start = new Date(activeSub.startDate);
        const end = new Date(activeSub.endDate);

        if (today > end) throw new Error("Subscription already expired");

        const totalDays = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
        const remainingDays = (end.getTime() - today.getTime()) / (1000 * 3600 * 24);

        const basePrice = activeSub.billingCycle === "Annually" ? addon.annualPrice : addon.monthlyPrice;
        const proratedPrice = (basePrice * quantity) * (remainingDays / totalDays);

        activeSub.extraBranches += quantity;
        activeSub.amountPaid += proratedPrice;
        await activeSub.save({ session });

        await SubscriptionHistory.create([{
            restaurant: restaurantId,
            subscription: activeSub._id,
            action: "Addon Purchase",
            details: `Purchased ${quantity}x ${addon.addonName}.`,
            amountPaid: proratedPrice,
            creditsUsed: 0
        }], { session });

        await session.commitTransaction();
        session.endSession();

        sendSuccess(res, "Addon purchased successfully", { proratedPrice, activeSub });
    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();
        console.error("Purchase Addon Error:", error);
        sendError(res, error.message || "Internal server error", StatusCodes.INTERNAL_SERVER_ERROR);
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
