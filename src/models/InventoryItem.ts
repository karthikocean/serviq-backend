import mongoose, { Schema, Document } from "mongoose";

export interface IInventoryItem extends Document {
    restaurantId: mongoose.Types.ObjectId;
    branchId: mongoose.Types.ObjectId;
    categoryId: mongoose.Types.ObjectId;
    name: string;
    sku: string;
    currentStock: number;
    minAlertLevel: number;
    unit: string;
    costPerUnit: number;
    supplierName: string;
    supplierPhone: string;
    status: string;
    isDelete: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const inventoryItemSchema = new Schema<IInventoryItem>(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
        branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
        categoryId: { type: Schema.Types.ObjectId, ref: "InventoryCategory", required: true },
        name: { type: String, required: true },
        sku: { type: String, default: "" },
        currentStock: { type: Number, required: true, default: 0 },
        minAlertLevel: { type: Number, required: true, default: 0 },
        unit: { type: String, required: true },
        costPerUnit: { type: Number, required: true, default: 0 },
        supplierName: { type: String, default: "" },
        supplierPhone: { type: String, default: "" },
        status: { type: String, default: "available" },
        isDelete: { type: Boolean, default: false }
    },
    { timestamps: true }
);

const InventoryItem = mongoose.model<IInventoryItem>("InventoryItem", inventoryItemSchema);
export default InventoryItem;
