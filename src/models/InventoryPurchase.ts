import mongoose, { Schema, Document } from "mongoose";

export interface IInventoryPurchase extends Document {
    restaurantId: mongoose.Types.ObjectId;
    branchId: mongoose.Types.ObjectId;
    itemId: mongoose.Types.ObjectId;
    supplierName: string;
    supplierPhone: string;
    purchaseQty: number;
    unitPrice: number;
    totalAmount: number;
    invoiceNumber: string;
    purchaseDate: Date;
    addedBy: mongoose.Types.ObjectId;
    isDelete: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const inventoryPurchaseSchema = new Schema<IInventoryPurchase>(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
        branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
        itemId: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true },
        supplierName: { type: String, required: true },
        supplierPhone: { type: String, default: "" },
        purchaseQty: { type: Number, required: true },
        unitPrice: { type: Number, required: true },
        totalAmount: { type: Number, required: true },
        invoiceNumber: { type: String, required: true },
        purchaseDate: { type: Date, required: true },
        addedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        isDelete: { type: Boolean, default: false }
    },
    { timestamps: true }
);

const InventoryPurchase = mongoose.model<IInventoryPurchase>("InventoryPurchase", inventoryPurchaseSchema);
export default InventoryPurchase;
