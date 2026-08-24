import mongoose, { Schema, Document } from "mongoose";

export interface ISubscription extends Document {
    subscriptionId: string;
    restaurant: mongoose.Types.ObjectId; // Reference to Restaurant
    plan: mongoose.Types.ObjectId;       // Reference to Plan
    billingCycle: "Monthly" | "Annually";
    startDate: Date;
    endDate: Date;
    renewalDate: Date;
    maxBranches: number;
    features: Record<string, boolean>;
    extraBranches: number;
    planPrice: number;
    addonAmount: number;
    discountAmount: number;
    creditUsed: number;
    amountPaid: number;
    changedFrom?: mongoose.Types.ObjectId; // Reference to old subscription if this was an upgrade/downgrade/plan change
    renewedFrom?: mongoose.Types.ObjectId;  // Reference to old subscription if this was a renewal
    status: "Active" | "Expiring Soon" | "Expired" | "Cancelled" | "Scheduled";
    isActive: boolean;
    isDelete: boolean;
}

const SubscriptionSchema = new Schema<ISubscription>(
    {
        subscriptionId: { type: String, unique: true },
        restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
        plan: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
        billingCycle: { type: String, enum: ["Monthly", "Annually"], required: true, default: "Monthly" },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        renewalDate: { type: Date, required: true },
        maxBranches: { type: Number, required: true },
        features: { type: Object, required: true },
        extraBranches: { type: Number, default: 0 },
        planPrice: { type: Number, default: 0 },
        addonAmount: { type: Number, default: 0 },
        discountAmount: { type: Number, default: 0 },
        creditUsed: { type: Number, default: 0 },
        amountPaid: { type: Number, default: 0 },
        changedFrom: { type: Schema.Types.ObjectId, ref: "Subscription", default: null },
        renewedFrom: { type: Schema.Types.ObjectId, ref: "Subscription", default: null },
        status: {
            type: String,
            enum: ["Active", "Expiring Soon", "Expired", "Cancelled", "Scheduled"],
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
