import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import Restaurant from "../../models/Restaurant";
import Plan from "../../models/Plan";
import Subscription from "../../models/Subscription";
import Branch from "../../models/Branch";
import User from "../../models/User";
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

        const restaurants = await Restaurant.find({ isDelete: false })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
            
        pagination(total, restaurants, limit, pageIndex, res, "Restaurants fetched successfully.");
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const createRestaurant = async (req: Request, res: Response): Promise<void> => {

    try {
        const {
            restaurantName, logoUrl, ownerName, email, phoneNumber, planId, password, billingCycle,
            websiteDomain, openingTime, closingTime, taxRate, serviceFee, bannerUrl,
            address, city, state, country, fssaiLicense, gstinNumber, panNumber
        } = req.body;

        if (!restaurantName || !ownerName || !email || !phoneNumber || !planId || !password) {
            sendError(res, "All required fields must be provided.", StatusCodes.BAD_REQUEST);
            return;
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

        const plan = await Plan.findById(planId);
        if (!plan) {
            sendError(res, "Plan not found.", StatusCodes.NOT_FOUND);
            return;
        }

        // Generate next Restaurant ID
        const totalCount = await Restaurant.countDocuments();
        const nextIdNumber = totalCount + 1;
        const restaurantIdStr = `R-${nextIdNumber.toString().padStart(2, "0")}`;

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
            taxRate,
            serviceFee,
            bannerUrl,
            address,
            city,
            state,
            country,
            fssaiLicense,
            gstinNumber,
            panNumber,
            isActive: true,
            isDelete: false
        });
        await newRestaurant.save();

        // 2. Create Subscription
        const startDate = new Date();
        const endDate = new Date();
        const cycle = billingCycle || "Monthly";
        if (cycle === "Monthly") {
            endDate.setMonth(endDate.getMonth() + 1);
        } else {
            endDate.setFullYear(endDate.getFullYear() + 1);
        }

        const newSubscription = new Subscription({
            restaurant: newRestaurant._id,
            plan: plan._id,
            billingCycle: cycle,
            startDate,
            endDate,
            renewalDate: endDate,
            maxBranches: plan.maxBranches,
            features: plan.featuresIncluded,
            status: "Active"
        });
        await newSubscription.save();

        // 3. Create Main Branch
        const mainBranch = new Branch({
            restaurantId: newRestaurant._id,
            branchName: "Main Branch",
            branchCode: `${restaurantIdStr}-B01`,
            contactNumber: phoneNumber,
            email: email,
            address: address, // Used from UI input
            isMainBranch: true
        });
        await mainBranch.save();

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

        sendSuccess(res, "Restaurant created successfully.", { id: newRestaurant._id }, StatusCodes.CREATED);
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
            restaurantName, logoUrl, ownerName, email, phoneNumber, isActive,
            websiteDomain, openingTime, closingTime, taxRate, serviceFee, bannerUrl,
            address, city, state, country, fssaiLicense, gstinNumber, panNumber
        } = req.body;

        const restaurant = await Restaurant.findOne({ _id: id, isDelete: false });
        if (!restaurant) {
            sendError(res, "Restaurant not found.", StatusCodes.NOT_FOUND);
            return;
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
        if (taxRate !== undefined) restaurant.taxRate = taxRate;
        if (serviceFee !== undefined) restaurant.serviceFee = serviceFee;
        if (bannerUrl !== undefined) restaurant.bannerUrl = bannerUrl;
        if (address !== undefined) restaurant.address = address;
        if (city !== undefined) restaurant.city = city;
        if (state !== undefined) restaurant.state = state;
        if (country !== undefined) restaurant.country = country;
        if (fssaiLicense !== undefined) restaurant.fssaiLicense = fssaiLicense;
        if (gstinNumber !== undefined) restaurant.gstinNumber = gstinNumber;
        if (panNumber !== undefined) restaurant.panNumber = panNumber;

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
        if (phoneNumber || email || address) {
            const mainBranch = await Branch.findOne({ restaurantId: restaurant._id, isMainBranch: true, isDelete: false });
            if (mainBranch) {
                if (phoneNumber) mainBranch.contactNumber = phoneNumber;
                if (email) mainBranch.email = email;
                if (address) mainBranch.address = address;
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
