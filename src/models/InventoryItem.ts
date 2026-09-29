import mongoose, { Schema, Document } from "mongoose";

export interface IInventoryItem extends Document {
    restaurantId: mongoose.Types.ObjectId;
    branchId?: mongoose.Types.ObjectId;
    categoryId?: mongoose.Types.ObjectId;
    category?: string;
    itemCode: string;
    name: string;
    sku?: string;
    currentStock?: number;
    minAlertLevel: number;
    unit: string;
    costPerUnit?: number;
    status?: string;
    isActive: boolean;
    isDelete: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const inventoryItemSchema = new Schema<IInventoryItem>(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
        branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: false },
        categoryId: { type: Schema.Types.ObjectId, ref: "InventoryCategory", required: false },
        category: { type: String, default: "" },
        itemCode: { type: String, required: true },
        name: { type: String, required: true },
        sku: { type: String, default: "" },
        currentStock: { type: Number, default: 0 },
        minAlertLevel: { type: Number, required: true, default: 0 },
        unit: { type: String, required: true },
        costPerUnit: { type: Number, default: 0 },
        status: { type: String, default: "Active" },
        isActive: { type: Boolean, default: true },
        isDelete: { type: Boolean, default: false }
    },
    { timestamps: true }
);

const InventoryItem = mongoose.model<IInventoryItem>("InventoryItem", inventoryItemSchema);
export default InventoryItem;
