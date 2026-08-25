import mongoose, { Schema, Document } from "mongoose";

export interface IAddon extends Document {
    addonName: string;
    addonType: "BRANCH";
    monthlyPrice: number;
    annualPrice: number;
    isActive: boolean;
    isDelete: boolean;
}

const AddonSchema = new Schema<IAddon>(
    {
        addonName: { type: String, required: true },
        addonType: { type: String, enum: ["BRANCH"], default: "BRANCH" },
        monthlyPrice: { type: Number, required: true },
        annualPrice: { type: Number, required: true },
        isActive: { type: Boolean, default: true },
        isDelete: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const Addon = mongoose.model<IAddon>("Addon", AddonSchema);
export default Addon;
