import mongoose, { Schema, Document } from "mongoose";

export interface IBillingItem {
    name: string;
    qty: number;
    price: number;
    total: number;
}

export interface IBilling extends Document {
    restaurantId: mongoose.Types.ObjectId;
    branchId: mongoose.Types.ObjectId;
    orderId: mongoose.Types.ObjectId;
    orderRefId: string; // The readable order ID (e.g., ORD-845)
    invoiceId: string; // e.g., INV-10245
    tableNumber: string;
    subtotal: number;
    tax: number;
    discount: number;
    charge: number;
    totalAmount: number;
    paymentMethod: string;
    paymentStatus: string;
    transactionId?: string;
    staffName: string;
    items: IBillingItem[];
    isDelete: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const billingSchema = new Schema<IBilling>(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
        branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
        orderRefId: { type: String, required: true },
        invoiceId: { type: String, required: true, unique: true },
        tableNumber: { type: String, required: true },
        subtotal: { type: Number, required: true },
        tax: { type: Number, required: true },
        discount: { type: Number, default: 0 },
        charge: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true },
        paymentMethod: { type: String, required: true },
        paymentStatus: { type: String, default: "Paid" },
        transactionId: { type: String, default: null },
        staffName: { type: String, required: true },
        items: [
            {
                name: { type: String, required: true },
                qty: { type: Number, required: true },
                price: { type: Number, required: true },
                total: { type: Number, required: true }
            }
        ],
        isDelete: { type: Boolean, default: false }
    },
    { timestamps: true }
);

const Billing = mongoose.model<IBilling>("Billing", billingSchema);
export default Billing;
