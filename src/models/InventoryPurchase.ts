import mongoose, { Schema, Document } from "mongoose";

export interface IInventoryPurchase extends Document {
    restaurantId: mongoose.Types.ObjectId;
    branchId: mongoose.Types.ObjectId;
    purchaseNo: string;
    purchaseType: string;
    vendorId?: mongoose.Types.ObjectId;
    supplierName: string;
    supplierPhone?: string;
    itemId?: mongoose.Types.ObjectId;
    itemName?: string;
    purchaseQty: number;
    unitPrice: number;
    unit?: string;
    totalAmount: number;
    invoiceNumber: string;
    purchaseDate: Date;
    remarks?: string;
    addedBy: mongoose.Types.ObjectId;
    isDelete: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const inventoryPurchaseSchema = new Schema<IInventoryPurchase>(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
        branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
        purchaseNo: { type: String, required: true },
        purchaseType: { type: String, default: "Material Purchase" },
        vendorId: { type: Schema.Types.ObjectId, ref: "Vendor" },
        supplierName: { type: String, required: true },
        supplierPhone: { type: String, default: "" },
        itemId: { type: Schema.Types.ObjectId, ref: "InventoryItem" },
        itemName: { type: String, default: "" },
        purchaseQty: { type: Number, required: true },
        unitPrice: { type: Number, required: true },
        unit: { type: String, default: "kg" },
        totalAmount: { type: Number, required: true },
        invoiceNumber: { type: String, default: "" },
        purchaseDate: { type: Date, required: true },
        remarks: { type: String, default: "" },
        addedBy: { type: Schema.Types.ObjectId, ref: "User" },
        isDelete: { type: Boolean, default: false }
    },
    { timestamps: true }
);

const InventoryPurchase = mongoose.model<IInventoryPurchase>("InventoryPurchase", inventoryPurchaseSchema);
export default InventoryPurchase;
