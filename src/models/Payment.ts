import mongoose, { Schema, Document } from "mongoose";

export interface IPayment extends Document {
    restaurant: mongoose.Types.ObjectId;
    subscription?: mongoose.Types.ObjectId;
    transactionId?: string;
    amount: number;
    taxAmount: number;
    currency: string;
    paymentDate?: Date;
    paymentStatus: "Pending" | "Paid" | "Failed" | "Refunded" | "Waived";
    paymentMethod?: string;
    paymentType?: "Gateway" | "Manual";
    paymentProof?: string;
    notes?: string;
    metadata?: Record<string, any>;
    isDelete: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const PaymentSchema = new Schema<IPayment>(
    {
        restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
        subscription: { type: Schema.Types.ObjectId, ref: "Subscription", default: null },
        transactionId: { type: String, default: null },
        amount: { type: Number, required: true },
        taxAmount: { type: Number, default: 0 },
        currency: { type: String, default: "INR" },
        paymentDate: { type: Date, default: null },
        paymentStatus: {
            type: String,
            enum: ["Pending", "Paid", "Failed", "Refunded", "Waived"],
            default: "Pending",
            required: true
        },
        paymentMethod: { type: String, default: null },
        paymentType: {
            type: String,
            enum: ["Gateway", "Manual"],
            default: "Gateway"
        },
        paymentProof: {
            type: String,
            default: null
        },
        notes: { type: String, default: null },
        metadata: { type: Schema.Types.Mixed, default: {} },
        isDelete: { type: Boolean, default: false }
    },
    { timestamps: true }
);

const Payment = mongoose.model<IPayment>("Payment", PaymentSchema);
export default Payment;
