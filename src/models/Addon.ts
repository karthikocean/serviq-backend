import mongoose, { Schema, Document } from "mongoose";

export interface IAddon extends Document {
    addonName: string;
    description: string;
    monthlyPrice: number;
    annualPrice: number;
    billingType: "Per Branch / Month" | "Per Branch / Year" | "Fixed";
    status: "Active" | "Inactive";
    isActive: boolean;
    isDelete: boolean;
}

const AddonSchema = new Schema<IAddon>(
    {
        addonName: { type: String, required: true },
        description: { type: String, default: "" },
        monthlyPrice: { type: Number, required: true },
        annualPrice: { type: Number, required: true },
        billingType: { type: String, enum: ["Per Branch / Month", "Per Branch / Year", "Fixed"], default: "Per Branch / Month" },
        status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
        isActive: { type: Boolean, default: true },
        isDelete: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const Addon = mongoose.model<IAddon>("Addon", AddonSchema);
export default Addon;
