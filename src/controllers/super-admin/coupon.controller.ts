import { Request, Response } from "express";
import Coupon from "../../models/Coupon";
import { pagination } from "../../utils/pagination";

// Create Coupon
export const createCoupon = async (req: Request, res: Response): Promise<void> => {
    try {
        const { code } = req.body;
        const existingCoupon = await Coupon.findOne({ code, isDelete: false });
        if (existingCoupon) {
            res.status(400).json({ success: false, message: "Coupon code already exists" });
            return;
        }

        const coupon = new Coupon(req.body);
        await coupon.save();

        res.status(201).json({ success: true, message: "Coupon created successfully", data: coupon });
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

// Get All Coupons
export const getCoupons = async (req: Request, res: Response): Promise<void> => {
    try {
        const pageIndex = parseInt(req.query.pageIndex as string) || 0;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string || "";

        const skip = pageIndex * limit;

        const query: any = { isDelete: false };
        if (search) {
            query.$or = [
                { code: { $regex: search, $options: "i" } },
                { name: { $regex: search, $options: "i" } }
            ];
        }

        const total = await Coupon.countDocuments(query);
        const coupons = await Coupon.find(query)
            .populate("plans", "planName")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        pagination(total, coupons, limit, pageIndex, res, "Coupons fetched successfully.");
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

// Get Single Coupon
export const getCouponById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const coupon = await Coupon.findOne({ _id: id, isDelete: false }).populate("plans", "planName");
        if (!coupon) {
            res.status(404).json({ success: false, message: "Coupon not found" });
            return;
        }
        res.status(200).json({ success: true, data: coupon });
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

// Update Coupon
export const updateCoupon = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const coupon = await Coupon.findOneAndUpdate({ _id: id, isDelete: false }, req.body, { new: true, runValidators: true });
        if (!coupon) {
            res.status(404).json({ success: false, message: "Coupon not found" });
            return;
        }
        res.status(200).json({ success: true, message: "Coupon updated successfully", data: coupon });
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

// Delete Coupon
export const deleteCoupon = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const coupon = await Coupon.findOneAndUpdate({ _id: id, isDelete: false }, { isDelete: true }, { new: true });
        if (!coupon) {
            res.status(404).json({ success: false, message: "Coupon not found" });
            return;
        }
        res.status(200).json({ success: true, message: "Coupon deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};
