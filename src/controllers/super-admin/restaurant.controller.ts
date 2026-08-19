import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import Restaurant from "../../models/Restaurant";
import Plan from "../../models/Plan";
import Subscription from "../../models/Subscription";
import Branch from "../../models/Branch";
import User from "../../models/User";
import Lead from "../../models/Lead";
import { sendSuccess, sendError } from "../../utils/response";
import { pagination } from "../../utils/pagination";
import { AuthRequest } from "../../middleware/authMiddleware";

// GET all active restaurants (populated with subscription plans)
export const getAllRestaurants = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const pageIndex = Math.max(0, page - 1);
        const skip = pageIndex * limit;

        const total = await Restaurant.countDocuments({ isDelete: false });

        const dbRestaurants = await Restaurant.find({ isDelete: false })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const restaurants = await Promise.all(dbRestaurants.map(async (rest) => {
            const subscription = await Subscription.findOne({ restaurant: rest._id }).populate("plan").lean();
            return {
                ...rest,
                subscription: subscription || null
            };
        }));

        pagination(total, restaurants, limit, pageIndex, res, "Restaurants fetched successfully.");
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const createRestaurant = async (req: Request, res: Response): Promise<void> => {

    try {
        const {
            restaurantName, logoUrl, ownerName, email, phoneNumber, planId, password, billingCycle,
            websiteDomain, openingTime, closingTime, taxRate, serviceFee, bannerUrl, startDate: reqStartDate, endDate: reqEndDate, renewalDate: reqRenewalDate, subscriptionStatus: reqSubscriptionStatus,
            address, city, state, country, fssaiLicense, gstinNumber, panNumber, leadId
        } = req.body;

        if (!restaurantName || !ownerName || !email || !phoneNumber || !password) {
            sendError(res, "All required fields must be provided.", StatusCodes.BAD_REQUEST);
            return;
        }

        const fssaiLicenseRegex = /^1\d{13}$/;
        if (fssaiLicense && !fssaiLicenseRegex.test(fssaiLicense.trim())) {
            sendError(
                res,
                "Invalid FSSAI License number. It must contain exactly 14 digits and start with 1.",
                StatusCodes.BAD_REQUEST
            );
            return;
        }

        const normalizedGstin = gstinNumber ? gstinNumber.trim().toUpperCase() : undefined;
        if (normalizedGstin) {
            const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
            if (!gstinRegex.test(normalizedGstin)) {
                sendError(res, "Invalid GSTIN. Please enter a valid 15-character GSTIN.", StatusCodes.BAD_REQUEST);
                return;
            }
            const existingGstin = await Restaurant.findOne({ gstinNumber: normalizedGstin, isDelete: false });
            if (existingGstin) {
                sendError(res, "GSTIN is already registered with another restaurant.", StatusCodes.CONFLICT);
                return;
            }
        }

        const normalizedPan = panNumber ? panNumber.trim().toUpperCase() : undefined;
        if (normalizedPan) {
            const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
            if (!panRegex.test(normalizedPan)) {
                sendError(res, "Invalid PAN number. Please enter a valid 10-character PAN.", StatusCodes.BAD_REQUEST);
                return;
            }
        }

        // Check for existing active email in Restaurant
        const existingRestaurant = await Restaurant.findOne({ email, isDelete: false });
        if (existingRestaurant) {
            sendError(res, "Email already registered for a restaurant.", StatusCodes.CONFLICT);
            return;
        }

        // Check for existing active phone in User
        const existingUser = await User.findOne({ phoneNumber, isDelete: false });
        if (existingUser) {
            sendError(res, "Phone number already registered for a user.", StatusCodes.CONFLICT);
            return;
        }

        let plan = null;
        if (planId) {
            plan = await Plan.findById(planId);
            if (!plan) {
                sendError(res, "Plan not found.", StatusCodes.NOT_FOUND);
                return;
            }
        }

        // Generate next Restaurant ID
        const totalCount = await Restaurant.countDocuments();
        const nextIdNumber = totalCount + 1;
        const restaurantIdStr = `R-${nextIdNumber.toString().padStart(2, "0")}`;

        let createdRestaurantId = null;
        let createdSubscriptionId = null;
        let createdBranchId = null;
        let createdUserId = null;

        try {
            // 1. Create Restaurant
            const newRestaurant = new Restaurant({
                restaurantId: restaurantIdStr,
                restaurantName,
                logoUrl,
                ownerName,
                email,
                phoneNumber,
                websiteDomain,
                openingTime,
                closingTime,
                bannerUrl,
                address,
                city,
                state,
                country,
                fssaiLicense,
                gstinNumber: normalizedGstin || gstinNumber,
                panNumber,
                isActive: true,
                isDelete: false
            });
            await newRestaurant.save();
            createdRestaurantId = newRestaurant._id;

            // 2. Create Subscription
            if (planId && plan) {
                const cycle = billingCycle || "Monthly";

                let finalStartDate = reqStartDate ? new Date(reqStartDate) : new Date();
                let finalEndDate = reqEndDate ? new Date(reqEndDate) : new Date(finalStartDate);
                if (!reqEndDate) {
                    if (cycle === "Monthly") {
                        finalEndDate.setMonth(finalEndDate.getMonth() + 1);
                    } else {
                        finalEndDate.setFullYear(finalEndDate.getFullYear() + 1);
                    }
                }
                let finalRenewalDate = reqRenewalDate ? new Date(reqRenewalDate) : finalEndDate;
                let finalStatus = reqSubscriptionStatus || "Active";

                const newSubscription = new Subscription({
                    restaurant: newRestaurant._id,
                    plan: plan._id,
                    billingCycle: cycle,
                    startDate: finalStartDate,
                    endDate: finalEndDate,
                    renewalDate: finalRenewalDate,
                    maxBranches: plan.maxBranches,
                    features: plan.featuresIncluded,
                    status: finalStatus
                });
                await newSubscription.save();
                createdSubscriptionId = newSubscription._id;
            }

            // 3. Create Main Branch
            const mainBranch = new Branch({
                restaurantId: newRestaurant._id,
                branchName: "Main Branch",
                branchCode: `${restaurantIdStr}-B01`,
                contactNumber: phoneNumber,
                email: email,
                address: {
                    street: address || "Not Provided",
                    city: city || "Not Provided",
                    state: state || "Not Provided",
                    country: country || "Not Provided",
                    pincode: req.body.pincode || "000000"
                },
                isMainBranch: true
            });
            await mainBranch.save();
            createdBranchId = mainBranch._id;

            // 4. Create Owner User
            const ownerUser = new User({
                name: ownerName,
                email: email,
                phoneNumber: phoneNumber,
                password: password, // will be hashed by pre-save hook
                userType: 'RESTAURANT_OWNER',
                restaurantId: newRestaurant._id,
                isActive: true,
                isDelete: false
            });
            await ownerUser.save();
            createdUserId = ownerUser._id;

            // 5. Update Lead if leadId is provided
            if (leadId) {
                const leadToUpdate = await Lead.findById(leadId);
                if (leadToUpdate) {
                    leadToUpdate.leadStatus = 'Converted';
                    leadToUpdate.convertedRestaurantId = newRestaurant._id as mongoose.Types.ObjectId;
                    await leadToUpdate.save();
                }
            }

            sendSuccess(res, "Restaurant created successfully.", { id: newRestaurant._id }, StatusCodes.CREATED);
        } catch (error) {
            // Manual Rollback if running on a standalone MongoDB instance that doesn't support transactions
            if (createdUserId) await User.findByIdAndDelete(createdUserId);
            if (createdBranchId) await Branch.findByIdAndDelete(createdBranchId);
            if (createdSubscriptionId) await Subscription.findByIdAndDelete(createdSubscriptionId);
            if (createdRestaurantId) await Restaurant.findByIdAndDelete(createdRestaurantId);
            throw error;
        }
    } catch (error) {
        console.error("Create Restaurant Error:", error);
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// PUT Update restaurant details & password management
export const updateRestaurant = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const {
            restaurantName, logoUrl, ownerName, email, phoneNumber,
            websiteDomain, openingTime, closingTime, taxRate, serviceFee, bannerUrl, startDate: reqStartDate, endDate: reqEndDate, renewalDate: reqRenewalDate, subscriptionStatus: reqSubscriptionStatus,
            address, city, state, country, fssaiLicense, gstinNumber, panNumber, isActive
        } = req.body;

        const restaurant = await Restaurant.findOne({ _id: id, isDelete: false });
        if (!restaurant) {
            sendError(res, "Restaurant not found.", StatusCodes.NOT_FOUND);
            return;
        }

        const fssaiLicenseRegex = /^1\d{13}$/;
        if (fssaiLicense && !fssaiLicenseRegex.test(fssaiLicense.trim())) {
            sendError(
                res,
                "Invalid FSSAI License number. It must contain exactly 14 digits and start with 1.",
                StatusCodes.BAD_REQUEST
            );
            return;
        }

        const normalizedGstin = gstinNumber ? gstinNumber.trim().toUpperCase() : undefined;
        if (normalizedGstin) {
            const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
            if (!gstinRegex.test(normalizedGstin)) {
                sendError(res, "Invalid GSTIN. Please enter a valid 15-character GSTIN.", StatusCodes.BAD_REQUEST);
                return;
            }
            const existingGstin = await Restaurant.findOne({ gstinNumber: normalizedGstin, _id: { $ne: id }, isDelete: false });
            if (existingGstin) {
                sendError(res, "GSTIN is already registered with another restaurant.", StatusCodes.CONFLICT);
                return;
            }
        }

        const normalizedPan = panNumber ? panNumber.trim().toUpperCase() : undefined;
        if (normalizedPan) {
            const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
            if (!panRegex.test(normalizedPan)) {
                sendError(res, "Invalid PAN number. Please enter a valid 10-character PAN.", StatusCodes.BAD_REQUEST);
                return;
            }
        }

        if (restaurantName) restaurant.restaurantName = restaurantName;
        if (logoUrl) restaurant.logoUrl = logoUrl;
        if (ownerName) restaurant.ownerName = ownerName;
        if (email) restaurant.email = email;
        if (phoneNumber) restaurant.phoneNumber = phoneNumber;

        // Update new UI fields if provided
        if (websiteDomain !== undefined) restaurant.websiteDomain = websiteDomain;
        if (openingTime !== undefined) restaurant.openingTime = openingTime;
        if (closingTime !== undefined) restaurant.closingTime = closingTime;
        if (bannerUrl !== undefined) restaurant.bannerUrl = bannerUrl;
        if (address !== undefined) restaurant.address = address;
        if (city !== undefined) restaurant.city = city;
        if (state !== undefined) restaurant.state = state;
        if (country !== undefined) restaurant.country = country;
        if (fssaiLicense !== undefined) restaurant.fssaiLicense = fssaiLicense;
        if (normalizedGstin !== undefined) restaurant.gstinNumber = normalizedGstin;
        if (normalizedPan !== undefined) restaurant.panNumber = normalizedPan;

        if (isActive !== undefined) restaurant.isActive = isActive;

        // Update associated owner user
        if (ownerName || email || phoneNumber || isActive !== undefined) {
            const ownerUser = await User.findOne({ restaurantId: restaurant._id, userType: 'RESTAURANT_OWNER', isDelete: false });
            if (ownerUser) {
                if (ownerName) ownerUser.name = ownerName;
                if (email) ownerUser.email = email;
                if (phoneNumber) ownerUser.phoneNumber = phoneNumber;
                if (isActive !== undefined) ownerUser.isActive = isActive;
                await ownerUser.save();
            }
        }

        // Update associated main branch
        if (phoneNumber || email || address || city || state || country || req.body.pincode) {
            const mainBranch = await Branch.findOne({ restaurantId: restaurant._id, isMainBranch: true, isDelete: false });
            if (mainBranch) {
                if (phoneNumber) mainBranch.contactNumber = phoneNumber;
                if (email) mainBranch.email = email;
                
                if (address || city || state || country || req.body.pincode) {
                    mainBranch.address = {
                        street: address || mainBranch.address?.street || "Not Provided",
                        city: city || mainBranch.address?.city || "Not Provided",
                        state: state || mainBranch.address?.state || "Not Provided",
                        country: country || mainBranch.address?.country || "Not Provided",
                        pincode: req.body.pincode || mainBranch.address?.pincode || "000000"
                    };
                }
                
                await mainBranch.save();
            }
        }

        await restaurant.save();
        sendSuccess(res, "Restaurant updated successfully.");
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// DELETE Soft-delete restaurant
export const deleteRestaurant = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const restaurant = await Restaurant.findOne({ _id: id, isDelete: false });
        if (!restaurant) {
            sendError(res, "Restaurant not found.", StatusCodes.NOT_FOUND);
            return;
        }

        restaurant.isDelete = true;
        await restaurant.save();

        // Soft delete associated users and branches
        await User.updateMany({ restaurantId: restaurant._id }, { isDelete: true });
        await Branch.updateMany({ restaurantId: restaurant._id }, { isDelete: true });
        sendSuccess(res, "Restaurant deleted successfully.");
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const updateRestaurantStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['Active', 'Suspended', 'Expired'].includes(status)) {
            sendError(res, "Invalid status. Must be Active, Suspended, or Expired.", StatusCodes.BAD_REQUEST);
            return;
        }

        const restaurant = await Restaurant.findById(id);
        if (!restaurant || restaurant.isDelete) {
            sendError(res, "Restaurant not found.", StatusCodes.NOT_FOUND);
            return;
        }

        restaurant.status = status;
        restaurant.isActive = status === 'Active';
        await restaurant.save();



        sendSuccess(res, `Restaurant status updated to ${status}.`, restaurant);
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};













