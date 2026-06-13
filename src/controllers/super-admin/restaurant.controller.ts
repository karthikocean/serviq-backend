import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import bcrypt from "bcryptjs";
import Restaurant from "../../models/Restaurant";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/authMiddleware";

// GET all active restaurants (populated with subscription plans)
export const getAllRestaurants = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const restaurants = await Restaurant.find({ isDelete: false })
            .populate("subscriptionPlan", "planName")
            .sort({ createdAt: -1 });
        sendSuccess(res, "Restaurants fetched successfully.", restaurants);
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// POST Register / Create a new restaurant
export const createRestaurant = async (req: Request, res: Response): Promise<void> => {
    try {
        const { restaurantName, logoUrl, ownerName, email, phoneNumber, subscriptionPlan, password } = req.body;

        if (!restaurantName || !ownerName || !email || !phoneNumber || !subscriptionPlan || !password) {
            sendError(res, "All required fields must be provided.", StatusCodes.BAD_REQUEST);
            return;
        }

        // Check for existing active email
        const existing = await Restaurant.findOne({ email, isDelete: false });
        if (existing) {
            sendError(res, "Email already registered.", StatusCodes.CONFLICT);
            return;
        }

        // Generate next Restaurant ID (e.g., R-01, R-02)
        const totalCount = await Restaurant.countDocuments();
        const nextIdNumber = totalCount + 1;
        const restaurantId = `R-${nextIdNumber.toString().padStart(2, "0")}`;

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newRestaurant = await Restaurant.create({
            restaurantId,
            restaurantName,
            logoUrl,
            ownerName,
            email,
            phoneNumber,
            subscriptionPlan,
            password: hashedPassword,
            isActive: true,
            isDelete: false
        });

        sendSuccess(res, "Restaurant created successfully.", { id: newRestaurant._id }, StatusCodes.CREATED);
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// PUT Update restaurant details & password management
export const updateRestaurant = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { restaurantName, logoUrl, ownerName, email, phoneNumber, subscriptionPlan, password, isActive } = req.body;

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
        if (subscriptionPlan) restaurant.subscriptionPlan = subscriptionPlan;
        if (isActive !== undefined) restaurant.isActive = isActive;

        // If password is provided, re-hash and update it
        if (password) {
            const salt = await bcrypt.genSalt(10);
            restaurant.password = await bcrypt.hash(password, salt);
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
        sendSuccess(res, "Restaurant deleted successfully.");
    } catch (error) {
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};
