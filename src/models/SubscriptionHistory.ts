import mongoose, { Schema, Document } from "mongoose";

export interface ISubscriptionHistory extends Document {
    restaurant: mongoose.Types.ObjectId;
    subscription: mongoose.Types.ObjectId; // Reference to the new active subscription
    action: "New Plan" | "Upgrade" | "Downgrade" | "Renew" | "Addon Purchase" | "Cancel" | "Plan Change";
    details: string;
    amountPaid: number;
    creditsUsed: number;
    isDelete: boolean;
}

const SubscriptionHistorySchema = new Schema<ISubscriptionHistory>(
    {
        restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
        subscription: { type: Schema.Types.ObjectId, ref: "Subscription", required: true },
        action: { 
            type: String, 
            enum: ["New Plan", "Upgrade", "Downgrade", "Renew", "Addon Purchase", "Cancel", "Plan Change"], 
            required: true 
        },
        details: { type: String, required: true },
        amountPaid: { type: Number, required: true },
        creditsUsed: { type: Number, default: 0 },
        isDelete: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const SubscriptionHistory = mongoose.model<ISubscriptionHistory>("SubscriptionHistory", SubscriptionHistorySchema);
export default SubscriptionHistory;
