import mongoose, { Schema, Document } from "mongoose";

export interface ICoupon extends Document {
    code: string;
    name: string;
    description?: string;
    type: 'Percentage' | 'Fixed Amount';
    value: number;
    maxDiscount?: number;
    minAmount?: number;
    plans: mongoose.Types.ObjectId[];
    startDate: Date;
    endDate: Date;
    limit?: number;
    used: number;
    usagePerRest?: number;
    status: 'Active' | 'Inactive';
    isDelete: boolean;
}

const CouponSchema = new Schema<ICoupon>(
    {
        code: { type: String, required: true, unique: true, uppercase: true },
        name: { type: String, required: true },
        description: { type: String },
        type: { type: String, enum: ['Percentage', 'Fixed Amount'], required: true },
        value: { type: Number, required: true },
        maxDiscount: { type: Number },
        minAmount: { type: Number },
        plans: [{ type: Schema.Types.ObjectId, ref: 'Plan' }],
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        limit: { type: Number },
        used: { type: Number, default: 0 },
        usagePerRest: { type: Number },
        status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
        isDelete: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const Coupon = mongoose.model<ICoupon>("Coupon", CouponSchema);
export default Coupon;
