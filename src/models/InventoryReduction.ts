import mongoose, { Schema, Document } from "mongoose";

export interface IInventoryReduction extends Document {
    restaurantId: mongoose.Types.ObjectId;
    branchId: mongoose.Types.ObjectId;
    itemId: mongoose.Types.ObjectId;
    quantityToReduce: number;
    reason: string;
    details: string;
    value: number;
    reducedBy: mongoose.Types.ObjectId;
    isDelete: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const inventoryReductionSchema = new Schema<IInventoryReduction>(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
        branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
        itemId: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true },
        quantityToReduce: { type: Number, required: true },
        reason: { type: String, required: true }, // Kitchen Usage, Spoilage, etc.
        details: { type: String, default: "" },
        value: { type: Number, required: true },
        reducedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        isDelete: { type: Boolean, default: false }
    },
    { timestamps: true }
);

const InventoryReduction = mongoose.model<IInventoryReduction>("InventoryReduction", inventoryReductionSchema);
export default InventoryReduction;
