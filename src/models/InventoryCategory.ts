import mongoose, { Schema, Document } from "mongoose";

export interface IInventoryCategory extends Document {
    restaurantId: mongoose.Types.ObjectId;
    branchId: mongoose.Types.ObjectId;
    name: string;
    description: string;
    status: "AVAILABLE" | "UNAVAILABLE";
    isDelete: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const inventoryCategorySchema = new Schema<IInventoryCategory>(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
        branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
        name: { type: String, required: true },
        description: { type: String, default: "" },
        status: { type: String, enum: ["AVAILABLE", "UNAVAILABLE"], default: "AVAILABLE" },
        isDelete: { type: Boolean, default: false }
    },
    { timestamps: true }
);

const InventoryCategory = mongoose.model<IInventoryCategory>("InventoryCategory", inventoryCategorySchema);
export default InventoryCategory;
