import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import Subscription from "../../models/Subscription";
import Restaurant from "../../models/Restaurant";
import Plan from "../../models/Plan";
import Addon from "../../models/Addon";
import SubscriptionHistory from "../../models/SubscriptionHistory";
import Payment from "../../models/Payment";
import { sendSuccess, sendError } from "../../utils/response";
import { pagination } from "../../utils/pagination";
import { AuthRequest } from "../../middleware/authMiddleware";

// GET all active subscriptions
export const getAllSubscriptions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 0;
        const limit = parseInt(req.query.limit as string) || 10;
        const pageIndex = Math.max(0, page);
        const skip = pageIndex * limit;

        const total = await Subscription.countDocuments({ isDelete: false });

        const subscriptions = await Subscription.find({ isDelete: false })
            .populate("restaurant", "restaurantName restaurantId")
            .populate("plan", "planName")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(); // Use lean to easily append properties

        // Fetch latest payment for each subscription to attach paymentProof
        const subsWithPayments = await Promise.all(subscriptions.map(async (sub: any) => {
            const latestPayment = await Payment.findOne({ subscription: sub._id, isDelete: false })
                .sort({ createdAt: -1 })
                .select("paymentProof paymentMethod");
                
            return {
                ...sub,
                latestPaymentProof: latestPayment?.paymentProof || null,
                paymentMethod: latestPayment?.paymentMethod || null
            };
        }));

        pagination(total, subsWithPayments, limit, pageIndex, res, "Subscriptions fetched successfully.");
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// GET subscription history
export const getSubscriptionHistory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 0;
        const limit = parseInt(req.query.limit as string) || 10;
        const pageIndex = Math.max(0, page);
        const skip = pageIndex * limit;

        const total = await SubscriptionHistory.countDocuments();

        const history = await SubscriptionHistory.find()
            .populate("restaurant", "restaurantName restaurantId")
            .populate("subscription", "startDate endDate renewalDate status")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        pagination(total, history, limit, pageIndex, res, "Subscription history fetched successfully.");
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// GET subscription by ID
export const getSubscriptionById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const subscription = await Subscription.findOne({ _id: id, isDelete: false })
            .populate("restaurant", "restaurantName restaurantId")
            .populate("plan", "planName maxBranches featuresIncluded");

        if (!subscription) {
            sendError(res, "Subscription not found.", StatusCodes.NOT_FOUND);
            return;
        }

        sendSuccess(res, "Subscription details fetched successfully.", subscription);
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// POST Assign / Create a new subscription
export const assignSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const { restaurant, plan, billingCycle, startDate, status, extraBranches = 0, paymentProof, paymentMethod, referenceId, notes } = req.body;

        if (!restaurant || !plan || !billingCycle || !startDate) {
            sendError(res, "Restaurant, plan, billing cycle, and start date are required.", StatusCodes.BAD_REQUEST);
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

        const start = new Date(startDate);
        const end = new Date(start);
        let planPrice = 0;

        if (billingCycle === 'Monthly') {
            end.setMonth(end.getMonth() + 1);
            planPrice = existingPlan.monthlyPrice;
        } else if (billingCycle === 'Annually') {
            end.setFullYear(end.getFullYear() + 1);
            planPrice = existingPlan.annualPrice;
        } else {
            sendError(res, "Invalid billing cycle. Must be Monthly or Annually.", StatusCodes.BAD_REQUEST);
            return;
        }

        // Calculate Addon Amount
        let addonAmount = 0;
        if (extraBranches > 0) {
            const Addon = mongoose.model("Addon");
            const branchAddon = await Addon.findOne({ addonType: "BRANCH", isActive: true });
            if (branchAddon) {
                const addonRate = billingCycle === "Annually" ? branchAddon.annualPrice : branchAddon.monthlyPrice;
                addonAmount = extraBranches * addonRate;
            }
        }

        const totalAmount = planPrice + addonAmount;
        const taxAmount = 0; // Removed mock 18% tax
        const finalAmount = totalAmount + taxAmount;

        // 1. Create Payment Record FIRST (Subscription is null initially)
        const Payment = mongoose.model("Payment");
        const paymentRecord = await Payment.create({
            restaurant,
            subscription: null, // Nullable initially
            amount: finalAmount,
            taxAmount,
            currency: "INR",
            paymentStatus: finalAmount === 0 ? "Waived" : "Paid",
            paymentMethod: finalAmount === 0 ? "Complimentary" : (paymentMethod || "Bank Transfer"),
            paymentType: "Manual",
            transactionId: referenceId || `TXN-${Date.now()}`,
            paymentProof: paymentProof || null,
            notes: notes || null,
            paymentDate: new Date()
        });

        // 2. Create the Subscription
        const count = await Subscription.countDocuments();
        const subId = `SUB-${String(count + 1).padStart(6, '0')}`;

        const newSubscription = await Subscription.create({
            subscriptionId: subId,
            restaurant,
            plan,
            billingCycle,
            startDate: start,
            endDate: end,
            renewalDate: end,
            maxBranches: existingPlan.maxBranches,
            features: existingPlan.featuresIncluded,
            extraBranches,
            planPrice,
            addonAmount,
            discountAmount: 0,
            creditUsed: 0,
            amountPaid: finalAmount,
            status: status || "Active",
            isActive: true,
            isDelete: false
        });

        // 3. Link Subscription to Payment
        paymentRecord.subscription = newSubscription._id;
        await paymentRecord.save();

        // 4. Create History
        await SubscriptionHistory.create({
            restaurant,
            subscription: newSubscription._id,
            action: "Assigned",
            details: `Assigned new plan: ${existingPlan.planName}`,
            newPlan: plan,
            newPlanName: existingPlan.planName,
            addonQuantity: extraBranches,
            amountPaid: finalAmount
        });

        sendSuccess(res, "Subscription assigned successfully.", newSubscription, StatusCodes.CREATED);
    } catch (error) {
        console.error("Assign Sub Error:", error);
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// POST Calculate Proration (for UI display)
export const calculateChangePlanProration = async (req: Request, res: Response): Promise<void> => {
    try {
        const { restaurantId, newPlanId } = req.body;

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) throw new Error("Restaurant not found");

        const activeSub = await Subscription.findOne({ restaurant: restaurantId, status: "Active", isDelete: false });
        if (!activeSub) throw new Error("No active subscription found to change");

        const newPlan = await Plan.findById(newPlanId);
        if (!newPlan) throw new Error("New plan not found");

        const billingCycle = activeSub.billingCycle;

        // Calculate Proration
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(activeSub.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(activeSub.endDate);
        end.setHours(0, 0, 0, 0);

        let unusedCredit = 0;
        const actualPlanValue = (activeSub.planPrice || 0) + (activeSub.addonAmount || 0) - (activeSub.discountAmount || 0);
        if (end > today) {
            const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
            const unusedDays = Math.round((end.getTime() - today.getTime()) / (1000 * 3600 * 24));
            unusedCredit = (unusedDays / totalDays) * actualPlanValue;
        }

        const newPlanPrice = billingCycle === "Annually" ? newPlan.annualPrice : newPlan.monthlyPrice;

        let newAddonAmount = 0;
        if (activeSub.extraBranches > 0) {
            const Addon = mongoose.model("Addon");
            const branchAddon = await Addon.findOne({ addonType: "BRANCH", isActive: true });
            if (branchAddon) {
                const addonRate = billingCycle === "Annually" ? branchAddon.annualPrice : branchAddon.monthlyPrice;
                newAddonAmount = activeSub.extraBranches * addonRate;
            }
        }

        const totalNewPrice = newPlanPrice + newAddonAmount;
        const previousWalletBalance = restaurant.subscriptionCredit || 0;
        let totalCredit = unusedCredit + previousWalletBalance;

        let payableAmount = totalNewPrice - totalCredit;
        let creditApplied = 0;
        let remainingWalletBalance = 0;

        if (payableAmount < 0) {
            remainingWalletBalance = Math.abs(payableAmount);
            creditApplied = totalNewPrice;
            payableAmount = 0;
        } else {
            creditApplied = totalCredit;
            remainingWalletBalance = 0;
        }

        sendSuccess(res, "Proration calculated", {
            currentPlanValue: actualPlanValue,
            unusedCredit: Math.round(unusedCredit),
            previousWalletBalance: Math.round(previousWalletBalance),
            totalAvailableCredit: Math.round(totalCredit),
            newPlanPrice: newPlanPrice,
            newAddonAmount: newAddonAmount,
            totalNewPrice: totalNewPrice,
            creditApplied: Math.round(creditApplied),
            finalPayable: Math.round(payableAmount),
            remainingWalletBalance: Math.round(remainingWalletBalance)
        }, StatusCodes.OK);
    } catch (error: any) {
        console.error("Calculate Proration Error:", error);
        sendError(res, error.message || "Internal server error.", StatusCodes.BAD_REQUEST);
    }
};

// POST Change Plan (Upgrade/Downgrade with Proration)
export const changePlan = async (req: Request, res: Response): Promise<void> => {
    try {
        const { restaurantId, newPlanId, paymentMethod, referenceId, notes, paymentProof } = req.body;

        // Not using session yet until Payment is created, but we could wrap everything in a transaction.
        // Actually, to make sure Payment isn't created if validation fails, let's validate first.
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) throw new Error("Restaurant not found");

        const activeSub = await Subscription.findOne({ restaurant: restaurantId, status: "Active", isDelete: false });
        if (!activeSub) throw new Error("No active subscription found to change");

        const oldPlan = await Plan.findById(activeSub.plan);
        if (!oldPlan) throw new Error("Old plan not found");

        const newPlan = await Plan.findById(newPlanId);
        if (!newPlan) throw new Error("New plan not found");

        const billingCycle = activeSub.billingCycle;

        // Calculate Proration
        const exactNow = new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(activeSub.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(activeSub.endDate);
        end.setHours(0, 0, 0, 0);

        let unusedCredit = 0;
        const actualPlanValue = (activeSub.planPrice || 0) + (activeSub.addonAmount || 0) - (activeSub.discountAmount || 0);
        if (end > today) {
            const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
            const unusedDays = Math.round((end.getTime() - today.getTime()) / (1000 * 3600 * 24));
            unusedCredit = (unusedDays / totalDays) * actualPlanValue;
        }

        let totalCredit = unusedCredit + (restaurant.subscriptionCredit || 0);
        const newPlanPrice = billingCycle === "Annually" ? newPlan.annualPrice : newPlan.monthlyPrice;

        // Calculate Addon Carry Over
        let newAddonAmount = 0;
        if (activeSub.extraBranches > 0) {
            const Addon = mongoose.model("Addon");
            const branchAddon = await Addon.findOne({ addonType: "BRANCH", isActive: true });
            if (branchAddon) {
                const addonRate = billingCycle === "Annually" ? branchAddon.annualPrice : branchAddon.monthlyPrice;
                newAddonAmount = activeSub.extraBranches * addonRate;
            }
        }

        const totalNewPrice = newPlanPrice + newAddonAmount;
        let payableAmount = totalNewPrice - totalCredit;
        let creditsUsed = 0;
        let remainingCredit = 0;

        if (payableAmount < 0) {
            remainingCredit = Math.abs(payableAmount);
            creditsUsed = totalNewPrice;
            payableAmount = 0; // Don't charge negative amount
        } else {
            creditsUsed = totalCredit;
            remainingCredit = 0;
        }

        const taxAmount = 0; // Removed mock 18% tax
        const finalAmount = payableAmount + taxAmount;

        // Create Payment
        const Payment = mongoose.model("Payment");
        const paymentRecord = await Payment.create({
            restaurant: restaurantId,
            subscription: null,
            amount: finalAmount,
            taxAmount: taxAmount,
            currency: "INR",
            paymentStatus: finalAmount === 0 ? "Waived" : "Paid",
            paymentMethod: finalAmount === 0 ? "Complimentary" : (paymentMethod || "Bank Transfer"),
            paymentType: "Manual",
            transactionId: referenceId || `TXN-${Date.now()}`,
            paymentProof: paymentProof || null,
            notes: notes || null,
            paymentDate: new Date()
        });

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            restaurant.subscriptionCredit = remainingCredit;
            await restaurant.save({ session });

            // Expire old sub
            activeSub.status = "Expired";
            await activeSub.save({ session });

            // Calculate new dates
            const newEndDate = new Date(exactNow);
            if (billingCycle === "Annually") {
                newEndDate.setFullYear(newEndDate.getFullYear() + 1);
            } else {
                newEndDate.setMonth(newEndDate.getMonth() + 1);
            }

            // Create new sub
            const count = await Subscription.countDocuments().session(session);
            const subId = `SUB-${String(count + 1).padStart(6, '0')}`;

            const newSub = await Subscription.create([{
                subscriptionId: subId,
                restaurant: restaurantId,
                plan: newPlanId,
                billingCycle: billingCycle || "Monthly",
                startDate: exactNow,
                endDate: newEndDate,
                renewalDate: newEndDate,
                maxBranches: newPlan.maxBranches,
                features: newPlan.featuresIncluded,
                status: "Active",
                planPrice: newPlanPrice,
                addonAmount: newAddonAmount,
                amountPaid: finalAmount,
                creditUsed: creditsUsed,
                extraBranches: activeSub.extraBranches, // Retain addons
                changedFrom: activeSub._id,
                isActive: true,
                isDelete: false
            }], { session });

            // Link payment
            paymentRecord.subscription = newSub[0]._id;
            await paymentRecord.save({ session });

            await SubscriptionHistory.create([{
                restaurant: restaurantId,
                subscription: newSub[0]._id,
                action: "Plan Changed",
                details: `Changed plan from ${oldPlan.planName} to ${newPlan.planName}. Prorated credit applied.`,
                previousPlan: oldPlan._id,
                previousPlanName: oldPlan.planName,
                newPlan: newPlanId,
                newPlanName: newPlan.planName,
                amountPaid: finalAmount
            }], { session });

            await session.commitTransaction();
            session.endSession();

            sendSuccess(res, "Plan changed successfully", { payableAmount: finalAmount, subscription: newSub[0] });
        } catch (txnError: any) {
            await session.abortTransaction();
            session.endSession();
            
            paymentRecord.paymentStatus = "Failed";
            await paymentRecord.save();
            throw txnError;
        }
    } catch (error: any) {
        console.error("Change Plan Error:", error);
        sendError(res, error.message || "Internal server error", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// POST Purchase Addon (Manage Addons)
export const purchaseAddon = async (req: Request, res: Response): Promise<void> => {
    try {
        const { restaurantId, extraBranches, additionalBranches, paymentMethod, referenceId, notes, paymentProof } = req.body;

        const activeSub = await Subscription.findOne({ restaurant: restaurantId, status: "Active", isDelete: false });
        if (!activeSub) {
            sendError(res, "No active subscription found", StatusCodes.NOT_FOUND);
            return;
        }

        const Addon = mongoose.model("Addon");
        const branchAddon = await Addon.findOne({ addonType: "BRANCH", isActive: true });
        if (!branchAddon) {
            sendError(res, "Branch Addon configuration not found", StatusCodes.NOT_FOUND);
            return;
        }

        // Proration math for the newly added branches ONLY
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(activeSub.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(activeSub.endDate);
        end.setHours(0, 0, 0, 0);

        if (today > end) {
            sendError(res, "Subscription already expired", StatusCodes.BAD_REQUEST);
            return;
        }

        const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
        const remainingDays = Math.round((end.getTime() - today.getTime()) / (1000 * 3600 * 24));

        const basePrice = activeSub.billingCycle === "Annually" ? branchAddon.annualPrice : branchAddon.monthlyPrice;
        const proratedRate = (basePrice / totalDays) * remainingDays;
        let payableAmount = additionalBranches * proratedRate;

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) throw new Error("Restaurant not found");

        let totalCredit = restaurant.subscriptionCredit || 0;
        let remainingCredit = totalCredit;
        let creditsUsed = 0;

        if (totalCredit > 0) {
            if (totalCredit >= payableAmount) {
                remainingCredit = totalCredit - payableAmount;
                creditsUsed = payableAmount;
                payableAmount = 0;
            } else {
                creditsUsed = totalCredit;
                payableAmount = payableAmount - totalCredit;
                remainingCredit = 0;
            }
        }

        const taxAmount = 0; // Removed mock 18% tax
        const finalAmount = payableAmount + taxAmount;

        // The new recurring AddonAmount for the subscription should reflect all extra branches
        const newTotalRecurringAddonAmount = extraBranches * basePrice;

        // 1. Create Payment
        const Payment = mongoose.model("Payment");
        const paymentRecord = await Payment.create({
            restaurant: restaurantId,
            subscription: activeSub._id,
            amount: finalAmount,
            taxAmount: taxAmount,
            currency: "INR",
            paymentStatus: finalAmount <= 0 ? "Waived" : "Paid",
            paymentMethod: finalAmount <= 0 ? "Complimentary" : (paymentMethod || "Bank Transfer"),
            paymentType: "Manual",
            transactionId: referenceId || `TXN-${Date.now()}`,
            paymentProof: paymentProof || null,
            notes: notes || null,
            paymentDate: new Date()
        });

        // 2. Wrap Sub updates in transaction
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            restaurant.subscriptionCredit = remainingCredit;
            await restaurant.save({ session });
            activeSub.extraBranches = extraBranches; // The new total
            activeSub.addonAmount = newTotalRecurringAddonAmount;
            await activeSub.save({ session });

            await SubscriptionHistory.create([{
                restaurant: restaurantId,
                subscription: activeSub._id,
                action: "Addon Added",
                details: `Added ${additionalBranches} extra branches. Total extra branches: ${extraBranches}`,
                addon: branchAddon._id,
                addonName: branchAddon.addonName,
                addonQuantity: additionalBranches,
                amountPaid: finalAmount
            }], { session });

            await session.commitTransaction();
            session.endSession();

            sendSuccess(res, "Addon purchased successfully", activeSub);
        } catch (txnError: any) {
            await session.abortTransaction();
            session.endSession();
            
            paymentRecord.paymentStatus = "Failed";
            await paymentRecord.save();
            throw txnError;
        }
    } catch (error: any) {
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

// POST Renew Subscription
export const renewSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { couponCode, paymentMethod, referenceId, notes, paymentProof } = req.body;

        const oldSub = await Subscription.findOne({ 
            _id: id, 
            status: { $in: ["Active", "Expiring Soon", "Expired", "Cancelled"] }, 
            isDelete: false 
        });
        if (!oldSub) {
            sendError(res, "No eligible subscription found to renew.", StatusCodes.NOT_FOUND);
            return;
        }

        const plan = await mongoose.model("Plan").findById(oldSub.plan);
        if (!plan) throw new Error("Plan not found");

        const planPrice = oldSub.billingCycle === "Annually" ? plan.annualPrice : plan.monthlyPrice;
        
        // Addon price calculation
        const Addon = mongoose.model("Addon");
        const extraBranchAddon = await Addon.findOne({ addonType: "BRANCH", isActive: true });
        let addonPrice = 0;
        if (extraBranchAddon && oldSub.extraBranches > 0) {
            const rate = oldSub.billingCycle === "Annually" ? extraBranchAddon.annualPrice : extraBranchAddon.monthlyPrice;
            addonPrice = oldSub.extraBranches * rate;
        }

        // Coupon calculation
        let discountAmount = 0;
        let appliedCouponId = null;
        if (couponCode) {
            const Coupon = mongoose.model("Coupon");
            const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), status: "Active", isDelete: false });
            
            if (!coupon) {
                sendError(res, "Invalid or inactive coupon code.", StatusCodes.BAD_REQUEST);
                return;
            }

            const today = new Date();
            if (today < new Date(coupon.startDate) || today > new Date(coupon.endDate)) {
                sendError(res, "Coupon code is expired or not yet valid.", StatusCodes.BAD_REQUEST);
                return;
            }

            if (coupon.limit && coupon.used >= coupon.limit) {
                sendError(res, "Coupon usage limit has been reached.", StatusCodes.BAD_REQUEST);
                return;
            }

            const totalBasePrice = planPrice + addonPrice;
            if (coupon.minAmount && totalBasePrice < coupon.minAmount) {
                sendError(res, `Minimum amount of ₹${coupon.minAmount} required to use this coupon.`, StatusCodes.BAD_REQUEST);
                return;
            }

            if (coupon.type === "Percentage") {
                discountAmount = totalBasePrice * (coupon.value / 100);
            } else {
                discountAmount = coupon.value;
            }

            if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
                discountAmount = coupon.maxDiscount;
            }

            appliedCouponId = coupon._id;
        }

        let finalAmount = planPrice + addonPrice - discountAmount;

        const restaurant = await Restaurant.findById(oldSub.restaurant);
        if (!restaurant) throw new Error("Restaurant not found");

        let totalCredit = restaurant.subscriptionCredit || 0;
        let remainingCredit = totalCredit;
        let creditsUsed = 0;

        if (totalCredit > 0) {
            if (totalCredit >= finalAmount) {
                remainingCredit = totalCredit - finalAmount;
                creditsUsed = finalAmount;
                finalAmount = 0;
            } else {
                creditsUsed = totalCredit;
                finalAmount = finalAmount - totalCredit;
                remainingCredit = 0;
            }
        }

        const taxAmount = 0; // Removed mock 18% tax
        const totalAmountWithTax = finalAmount + taxAmount;

        // 1. Create Payment Record (Paid/Waived)
        const Payment = mongoose.model("Payment");
        const paymentRecord = await Payment.create({
            restaurant: oldSub.restaurant,
            subscription: null,
            amount: totalAmountWithTax,
            taxAmount: taxAmount,
            currency: "INR",
            paymentStatus: totalAmountWithTax === 0 ? "Waived" : "Paid",
            paymentMethod: totalAmountWithTax === 0 ? "Complimentary" : (paymentMethod || "Bank Transfer"),
            paymentType: "Manual",
            transactionId: referenceId || `TXN-${Date.now()}`,
            paymentProof: paymentProof || null,
            notes: notes || null,
            paymentDate: new Date()
        });

        // Use transaction for the state transitions
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            restaurant.subscriptionCredit = remainingCredit;
            await restaurant.save({ session });

            // Race condition check
            const currentOldSub = await Subscription.findById(oldSub._id).session(session);
            if (!currentOldSub || currentOldSub.status === "Scheduled") {
                throw new Error("Subscription status changed during payment processing.");
            }

            // Determine dates and status
            let newStartDate = new Date();
            let newStatus = "Active";

            if (["Active", "Expiring Soon"].includes(currentOldSub.status) || 
                (currentOldSub.status === "Cancelled" && new Date(currentOldSub.endDate) > new Date())) {
                newStartDate = new Date(currentOldSub.endDate);
                newStatus = "Scheduled";
            }

            const newEndDate = new Date(newStartDate);
            if (currentOldSub.billingCycle === "Annually") {
                newEndDate.setFullYear(newEndDate.getFullYear() + 1);
            } else {
                newEndDate.setMonth(newEndDate.getMonth() + 1);
            }

            // Create New Subscription
            const count = await Subscription.countDocuments().session(session);
            const subId = `SUB-${String(count + 1).padStart(6, '0')}`;

            const newSub = new Subscription({
                subscriptionId: subId,
                restaurant: currentOldSub.restaurant,
                plan: currentOldSub.plan,
                billingCycle: currentOldSub.billingCycle,
                startDate: newStartDate,
                endDate: newEndDate,
                renewalDate: newEndDate,
                maxBranches: currentOldSub.maxBranches,
                features: currentOldSub.features,
                extraBranches: currentOldSub.extraBranches,
                planPrice: planPrice,
                addonAmount: addonPrice,
                discountAmount: discountAmount,
                creditUsed: creditsUsed,
                amountPaid: totalAmountWithTax,
                renewedFrom: currentOldSub._id,
                status: newStatus,
                isActive: newStatus === "Active",
                isDelete: false
            });
            await newSub.save({ session });

            // Link Payment to new Sub
            paymentRecord.subscription = newSub._id;
            await paymentRecord.save({ session });

            // Create History
            const newHistory = new SubscriptionHistory({
                restaurant: currentOldSub.restaurant,
                subscription: newSub._id,
                action: "Renewed",
                details: `Renewed subscription. Status: ${newStatus}`,
                previousPlan: currentOldSub.plan,
                newPlan: currentOldSub.plan,
                amountPaid: totalAmountWithTax
            });
            await newHistory.save({ session });

            if (appliedCouponId) {
                await mongoose.model("Coupon").findByIdAndUpdate(appliedCouponId, { $inc: { used: 1 } }, { session });
            }

            await session.commitTransaction();
            session.endSession();

            sendSuccess(res, "Subscription renewed successfully.", newSub);
        } catch (txnError: any) {
            await session.abortTransaction();
            session.endSession();
            
            // Revert payment status
            paymentRecord.paymentStatus = "Failed";
            await paymentRecord.save();
            throw txnError;
        }

    } catch (error: any) {
        console.error("Renew Subscription Error:", error);
        sendError(res, error.message || "Internal server error", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// POST Cancel Subscription
export const cancelSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        
        const subscription = await Subscription.findOne({ 
            _id: id, 
            status: { $in: ["Active", "Expiring Soon"] }, 
            isDelete: false 
        });
        
        if (!subscription) {
            sendError(res, "No eligible subscription found to cancel.", StatusCodes.NOT_FOUND);
            return;
        }

        // Keep isActive: true until endDate is reached. Just change status.
        subscription.status = "Cancelled";
        await subscription.save();

        await SubscriptionHistory.create({
            restaurant: subscription.restaurant,
            subscription: subscription._id,
            action: "Cancelled",
            details: `Subscription cancelled. Service remains active until ${new Date(subscription.endDate).toDateString()}.`,
            amountPaid: 0
        });

        sendSuccess(res, "Subscription cancelled successfully. It will remain active until the end of the billing period.", subscription);
    } catch (error) {
        console.error("Cancel Subscription Error:", error);
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// GET Addons
export const getAddons = async (req: Request, res: Response): Promise<void> => {
    try {
        const addons = await Addon.find({ isDelete: false });
        sendSuccess(res, "Addons fetched successfully.", addons);
    } catch (error) {
        console.error("Get Addons Error:", error);
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// POST Create Addon
export const createAddon = async (req: Request, res: Response): Promise<void> => {
    try {
        const { addonName, addonType, monthlyPrice, annualPrice, isActive } = req.body;
        const newAddon = await Addon.create({
            addonName,
            addonType,
            monthlyPrice,
            annualPrice,
            isActive
        });
        sendSuccess(res, "Addon created successfully.", newAddon);
    } catch (error) {
        console.error("Create Addon Error:", error);
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// PUT Update Addon
export const updateAddon = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { addonName, addonType, monthlyPrice, annualPrice, isActive } = req.body;
        
        const addon = await Addon.findByIdAndUpdate(id, {
            addonName,
            addonType,
            monthlyPrice,
            annualPrice,
            isActive
        }, { new: true });
        
        if (!addon) {
            sendError(res, "Addon not found", StatusCodes.NOT_FOUND);
            return;
        }
        
        sendSuccess(res, "Addon updated successfully.", addon);
    } catch (error) {
        console.error("Update Addon Error:", error);
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// DELETE Delete Addon
export const deleteAddon = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const addon = await Addon.findByIdAndUpdate(id, { isDelete: true }, { new: true });
        
        if (!addon) {
            sendError(res, "Addon not found", StatusCodes.NOT_FOUND);
            return;
        }
        
        sendSuccess(res, "Addon deleted successfully.", addon);
    } catch (error) {
        console.error("Delete Addon Error:", error);
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};
