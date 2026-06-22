import mongoose, { Schema, Document } from "mongoose";

export interface ISubscription extends Document {
    restaurant: mongoose.Types.ObjectId; // Reference to Restaurant
    plan: mongoose.Types.ObjectId;       // Reference to Plan
    startDate: Date;
    endDate: Date;
    renewalDate: Date;
    status: "Active" | "Expiring Soon" | "Expired" | "Cancelled";
    isActive: boolean;
    isDelete: boolean;
}

const SubscriptionSchema = new Schema<ISubscription>(
    {
        restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
        plan: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        renewalDate: { type: Date, required: true },
        status: {
            type: String,
            enum: ["Active", "Expiring Soon", "Expired", "Cancelled"],
            default: "Active",
            required: true
        },
        isActive: { type: Boolean, default: true },
        isDelete: { type: Boolean, default: false }
    },
    { timestamps: true }
);

const Subscription = mongoose.model<ISubscription>("Subscription", SubscriptionSchema);
export default Subscription;
