import mongoose, { Schema, Document } from "mongoose";

export interface IPlan extends Document {
    planName: string;
    planDescription: string;
    monthlyPrice: number;
    monthlyDiscount: number;
    annualPrice: number;
    featuresIncluded: mongoose.Types.ObjectId[];
    isActive: boolean;
    isDelete: boolean;
}

const PlanSchema = new Schema<IPlan>(
    {
        planName: { type: String, required: true },
        planDescription: { type: String, required: true },
        monthlyPrice: { type: Number, required: true },
        monthlyDiscount: { type: Number, required: true },
        annualPrice: { type: Number, required: true },
        featuresIncluded: [{ type: Schema.Types.ObjectId, ref: "Module", required: true }],
        isActive: { type: Boolean, default: true },
        isDelete: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const Plan = mongoose.model<IPlan>("Plan", PlanSchema);
export default Plan;
